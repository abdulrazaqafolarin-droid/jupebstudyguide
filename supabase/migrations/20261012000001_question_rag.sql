-- Question-bank RAG: embeddings + similarity match for grounding the AI tutor.
-- Mirrors 20260521000001_textbook_embeddings.sql conventions (pgvector, hnsw, SECURITY DEFINER match fn).

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.study_question_embeddings (
  question_id TEXT PRIMARY KEY REFERENCES public.study_questions(id) ON DELETE CASCADE,
  embedding VECTOR(768) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_question_embeddings_embedding_idx
  ON public.study_question_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE public.study_question_embeddings ENABLE ROW LEVEL SECURITY;

-- Questions themselves are readable by any authenticated user; embeddings mirror that.
DROP POLICY IF EXISTS "study_question_embeddings_select_all" ON public.study_question_embeddings;
CREATE POLICY "study_question_embeddings_select_all"
  ON public.study_question_embeddings FOR SELECT USING (true);

-- Only admins may write (backfill runs with service role, which bypasses RLS anyway).
DROP POLICY IF EXISTS "study_question_embeddings_insert_admin" ON public.study_question_embeddings;
CREATE POLICY "study_question_embeddings_insert_admin"
  ON public.study_question_embeddings FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
  );
DROP POLICY IF EXISTS "study_question_embeddings_update_admin" ON public.study_question_embeddings;
CREATE POLICY "study_question_embeddings_update_admin"
  ON public.study_question_embeddings FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
  );

-- Similarity match over VISIBLE questions only (hidden = true rows are excluded).
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
  FROM public.study_question_embeddings sqe
  JOIN public.study_questions sq ON sq.id = sqe.question_id
  WHERE (sq.hidden IS NOT TRUE)
    AND (filter_subject IS NULL OR sq.subject = filter_subject)
    AND 1 - (sqe.embedding <=> query_embedding) > match_threshold
  ORDER BY sqe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
