-- Complete JUPEB question RAG: hybrid search plus a durable, update-aware
-- embedding queue. Existing vector rows are kept and stamped against their
-- current source question; only missing and subsequently changed rows are queued.

ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS search_document TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      concat_ws(
        ' ',
        coalesce(subject, ''),
        coalesce(year::text, ''),
        coalesce(category, ''),
        coalesce(course, ''),
        coalesce(question, ''),
        coalesce(options::text, ''),
        coalesce(correct_answer, ''),
        coalesce(explanation, '')
      )
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS study_questions_search_document_gin_idx
  ON public.study_questions USING GIN (search_document);

ALTER TABLE public.study_question_embeddings
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Existing vector entries were generated from the then-current question bank.
-- Mark them current now; future edits are invalidated by the trigger below.
UPDATE public.study_question_embeddings AS e
SET source_updated_at = q.updated_at
FROM public.study_questions AS q
WHERE q.id = e.question_id
  AND e.source_updated_at IS NULL;

CREATE TABLE IF NOT EXISTS public.study_question_embedding_jobs (
  question_id TEXT PRIMARY KEY
    REFERENCES public.study_questions(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS study_question_embedding_jobs_ready_idx
  ON public.study_question_embedding_jobs (next_attempt_at, requested_at)
  WHERE locked_at IS NULL;

ALTER TABLE public.study_question_embedding_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.study_question_embedding_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_question_embedding_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.touch_study_question_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF ROW(
    NEW.subject, NEW.year, NEW.category, NEW.question, NEW.options,
    NEW.correct_answer, NEW.explanation, NEW.difficulty, NEW.course,
    NEW.image_url, NEW.image_position, NEW.hidden
  ) IS DISTINCT FROM ROW(
    OLD.subject, OLD.year, OLD.category, OLD.question, OLD.options,
    OLD.correct_answer, OLD.explanation, OLD.difficulty, OLD.course,
    OLD.image_url, OLD.image_position, OLD.hidden
  ) THEN
    NEW.updated_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS study_questions_touch_updated_at ON public.study_questions;
CREATE TRIGGER study_questions_touch_updated_at
BEFORE UPDATE ON public.study_questions
FOR EACH ROW EXECUTE FUNCTION public.touch_study_question_updated_at();

CREATE OR REPLACE FUNCTION public.enqueue_study_question_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(
    NEW.subject, NEW.year, NEW.category, NEW.question, NEW.options,
    NEW.correct_answer, NEW.explanation, NEW.difficulty, NEW.course,
    NEW.image_url, NEW.image_position, NEW.hidden
  ) IS NOT DISTINCT FROM ROW(
    OLD.subject, OLD.year, OLD.category, OLD.question, OLD.options,
    OLD.correct_answer, OLD.explanation, OLD.difficulty, OLD.course,
    OLD.image_url, OLD.image_position, OLD.hidden
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.hidden IS TRUE THEN
    DELETE FROM public.study_question_embedding_jobs WHERE question_id = NEW.id;
    DELETE FROM public.study_question_embeddings WHERE question_id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.study_question_embedding_jobs (
    question_id, requested_at, next_attempt_at, locked_at, attempts, last_error
  )
  VALUES (NEW.id, now(), now(), NULL, 0, NULL)
  ON CONFLICT (question_id) DO UPDATE
    SET requested_at = EXCLUDED.requested_at,
        next_attempt_at = EXCLUDED.next_attempt_at,
        locked_at = NULL,
        attempts = 0,
        last_error = NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS study_questions_enqueue_embedding ON public.study_questions;
CREATE TRIGGER study_questions_enqueue_embedding
AFTER INSERT OR UPDATE ON public.study_questions
FOR EACH ROW EXECUTE FUNCTION public.enqueue_study_question_embedding();

-- Repair existing visible rows that never received an embedding.
INSERT INTO public.study_question_embedding_jobs (question_id)
SELECT q.id
FROM public.study_questions AS q
LEFT JOIN public.study_question_embeddings AS e ON e.question_id = q.id
WHERE q.hidden IS NOT TRUE
  AND e.question_id IS NULL
ON CONFLICT (question_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_study_question_embedding_jobs(
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (question_id TEXT, requested_at TIMESTAMPTZ, attempts INTEGER)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH candidates AS (
    SELECT j.question_id
    FROM public.study_question_embedding_jobs AS j
    JOIN public.study_questions AS q ON q.id = j.question_id
    WHERE q.hidden IS NOT TRUE
      AND j.next_attempt_at <= now()
      AND (j.locked_at IS NULL OR j.locked_at < now() - interval '10 minutes')
    ORDER BY j.requested_at, j.question_id
    FOR UPDATE OF j SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10)
  )
  UPDATE public.study_question_embedding_jobs AS j
  SET locked_at = now(),
      attempts = j.attempts + 1
  FROM candidates AS c
  WHERE j.question_id = c.question_id
  RETURNING j.question_id, j.requested_at, j.attempts;
$$;

REVOKE ALL ON FUNCTION public.claim_study_question_embedding_jobs(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_study_question_embedding_jobs(INTEGER)
  TO service_role;

-- Vector results are returned only when their embedding matches the current
-- question version. A stale vector is never cited while a re-index is queued.
CREATE OR REPLACE FUNCTION public.match_study_questions(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT,
  filter_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  question_id TEXT,
  subject TEXT,
  year INT,
  category TEXT,
  question TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.id,
    sq.subject,
    sq.year,
    sq.category,
    sq.question,
    sq.options,
    sq.correct_answer,
    sq.explanation,
    1 - (sqe.embedding <=> query_embedding) AS similarity
  FROM public.study_question_embeddings AS sqe
  JOIN public.study_questions AS sq ON sq.id = sqe.question_id
  WHERE sq.hidden IS NOT TRUE
    AND sqe.source_updated_at = sq.updated_at
    AND (filter_subject IS NULL OR sq.subject = filter_subject)
    AND 1 - (sqe.embedding <=> query_embedding) > match_threshold
  ORDER BY sqe.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 30);
END;
$$;

CREATE OR REPLACE FUNCTION public.match_study_questions_text(
  query_text TEXT,
  match_count INT DEFAULT 8,
  filter_subject TEXT DEFAULT NULL,
  filter_year INT DEFAULT NULL,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  question_id TEXT,
  subject TEXT,
  year INT,
  category TEXT,
  question TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    q.id,
    q.subject,
    q.year,
    q.category,
    q.question,
    q.options,
    q.correct_answer,
    q.explanation,
    ts_rank_cd(q.search_document, websearch_to_tsquery('simple', query_text))::FLOAT AS similarity
  FROM public.study_questions AS q
  WHERE q.hidden IS NOT TRUE
    AND NULLIF(btrim(query_text), '') IS NOT NULL
    AND q.search_document @@ websearch_to_tsquery('simple', query_text)
    AND (filter_subject IS NULL OR q.subject = filter_subject)
    AND (filter_year IS NULL OR q.year = filter_year)
    AND (filter_category IS NULL OR q.category = filter_category)
  ORDER BY ts_rank_cd(q.search_document, websearch_to_tsquery('simple', query_text)) DESC,
           q.year DESC,
           q.id
  LIMIT LEAST(GREATEST(COALESCE(match_count, 8), 1), 30);
$$;

REVOKE ALL ON FUNCTION public.match_study_questions_text(TEXT, INT, TEXT, INT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_study_questions_text(TEXT, INT, TEXT, INT, TEXT)
  TO service_role;
