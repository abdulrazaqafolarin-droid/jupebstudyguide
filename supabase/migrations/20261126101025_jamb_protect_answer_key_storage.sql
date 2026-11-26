-- Keep JAMB answer keys exclusively in the service-role-only
-- study_question_answer_keys table. JUPEB retains its existing legacy
-- answer columns until its own client-side grading flow is migrated.
--
-- This is deliberately programme-scoped: it does not change JUPEB rows,
-- entitlement rules, question visibility, or any answer-key review state.

BEGIN;

-- Fail closed rather than clearing legacy columns if a protected key is
-- missing, incomplete, or does not match one of the question's options.
DO $preflight$
DECLARE
  v_invalid_count BIGINT;
BEGIN
  SELECT count(*)
    INTO v_invalid_count
    FROM public.study_questions AS question
    LEFT JOIN public.study_question_answer_keys AS answer_key
      ON answer_key.question_id = question.id
   WHERE question.exam_program_id = 'jamb'
     AND (
       answer_key.question_id IS NULL
       OR NULLIF(btrim(answer_key.correct_answer), '') IS NULL
       OR char_length(btrim(coalesce(answer_key.explanation, ''))) < 12
       OR NOT EXISTS (
         SELECT 1
           FROM jsonb_array_elements(coalesce(question.options, '[]'::jsonb))
             AS option_row(value)
          WHERE upper(btrim(coalesce(option_row.value->>'label', ''))) =
                upper(btrim(coalesce(answer_key.correct_answer, '')))
       )
     );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION
      'JAMB answer-key isolation stopped: % question(s) lack a complete protected answer key',
      v_invalid_count;
  END IF;
END;
$preflight$;

-- Remove only the duplicate answer material from JAMB question rows.
-- The authoritative draft/approved values remain in study_question_answer_keys.
UPDATE public.study_questions
   SET correct_answer = NULL,
       explanation = NULL
 WHERE exam_program_id = 'jamb'
   AND (correct_answer IS NOT NULL OR explanation IS NOT NULL);

-- Prevent old import paths or future client code from putting answer material
-- back into the learner-readable JAMB question table.
ALTER TABLE public.study_questions
  DROP CONSTRAINT IF EXISTS study_questions_jamb_answer_key_separation;

ALTER TABLE public.study_questions
  ADD CONSTRAINT study_questions_jamb_answer_key_separation
  CHECK (
    exam_program_id <> 'jamb'
    OR (correct_answer IS NULL AND explanation IS NULL)
  );

COMMENT ON CONSTRAINT study_questions_jamb_answer_key_separation
  ON public.study_questions IS
  'JAMB keys and explanations must be stored only in service-role-protected study_question_answer_keys; JUPEB legacy fields remain unchanged.';

-- The answer-key join is already limited to approved keys. For JAMB, never
-- fall back to the legacy question-row columns when the key is unapproved
-- or absent. JUPEB keeps its existing legacy-column fallback.
CREATE OR REPLACE FUNCTION public.match_study_questions(
  query_embedding extensions.vector,
  match_threshold DOUBLE PRECISION,
  match_count INTEGER,
  filter_subject TEXT DEFAULT NULL,
  filter_year INTEGER DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_exam_program TEXT DEFAULT 'jupeb'
)
RETURNS TABLE(
  question_id TEXT,
  exam_program_id TEXT,
  subject TEXT,
  year INTEGER,
  category TEXT,
  question TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    question.id,
    question.exam_program_id,
    question.subject,
    question.year,
    question.category,
    question.question,
    question.options,
    CASE
      WHEN question.exam_program_id = 'jamb' THEN answer_key.correct_answer
      ELSE coalesce(answer_key.correct_answer, question.correct_answer)
    END AS correct_answer,
    CASE
      WHEN question.exam_program_id = 'jamb' THEN answer_key.explanation
      ELSE coalesce(answer_key.explanation, question.explanation)
    END AS explanation,
    1 - (embedding.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity
  FROM public.study_question_embeddings AS embedding
  JOIN public.study_questions AS question
    ON question.id = embedding.question_id
  LEFT JOIN public.study_question_answer_keys AS answer_key
    ON answer_key.question_id = question.id
   AND answer_key.review_status = 'approved'
  WHERE question.hidden IS NOT TRUE
    AND question.review_status = 'published'
    AND embedding.source_updated_at = question.updated_at
    AND question.exam_program_id = coalesce(filter_exam_program, 'jupeb')
    AND (filter_subject IS NULL OR question.subject = filter_subject)
    AND (filter_year IS NULL OR question.year = filter_year)
    AND (filter_category IS NULL OR question.category = filter_category)
    AND 1 - (embedding.embedding OPERATOR(extensions.<=>) query_embedding) > match_threshold
  ORDER BY embedding.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 30);
$function$;

CREATE OR REPLACE FUNCTION public.match_study_questions_text(
  query_text TEXT,
  match_count INTEGER DEFAULT 8,
  filter_subject TEXT DEFAULT NULL,
  filter_year INTEGER DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_exam_program TEXT DEFAULT 'jupeb'
)
RETURNS TABLE(
  question_id TEXT,
  exam_program_id TEXT,
  subject TEXT,
  year INTEGER,
  category TEXT,
  question TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    question.id,
    question.exam_program_id,
    question.subject,
    question.year,
    question.category,
    question.question,
    question.options,
    CASE
      WHEN question.exam_program_id = 'jamb' THEN answer_key.correct_answer
      ELSE coalesce(answer_key.correct_answer, question.correct_answer)
    END AS correct_answer,
    CASE
      WHEN question.exam_program_id = 'jamb' THEN answer_key.explanation
      ELSE coalesce(answer_key.explanation, question.explanation)
    END AS explanation,
    ts_rank_cd(
      question.search_document_program,
      websearch_to_tsquery('simple', query_text)
    )::FLOAT AS similarity
  FROM public.study_questions AS question
  LEFT JOIN public.study_question_answer_keys AS answer_key
    ON answer_key.question_id = question.id
   AND answer_key.review_status = 'approved'
  WHERE question.hidden IS NOT TRUE
    AND question.review_status = 'published'
    AND NULLIF(btrim(query_text), '') IS NOT NULL
    AND question.search_document_program @@ websearch_to_tsquery('simple', query_text)
    AND question.exam_program_id = coalesce(filter_exam_program, 'jupeb')
    AND (filter_subject IS NULL OR question.subject = filter_subject)
    AND (filter_year IS NULL OR question.year = filter_year)
    AND (filter_category IS NULL OR question.category = filter_category)
  ORDER BY
    ts_rank_cd(question.search_document_program, websearch_to_tsquery('simple', query_text)) DESC,
    question.year DESC,
    question.id
  LIMIT LEAST(GREATEST(COALESCE(match_count, 8), 1), 30);
$function$;

-- Preserve the server-only RPC boundary after replacing the function bodies.
REVOKE ALL ON FUNCTION public.match_study_questions(
  extensions.vector, DOUBLE PRECISION, INTEGER, TEXT, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_study_questions(
  extensions.vector, DOUBLE PRECISION, INTEGER, TEXT, INTEGER, TEXT, TEXT
) TO service_role;

REVOKE ALL ON FUNCTION public.match_study_questions_text(
  TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_study_questions_text(
  TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.match_study_questions(
  extensions.vector, DOUBLE PRECISION, INTEGER, TEXT, INTEGER, TEXT, TEXT
) IS
  'Service-role-only retrieval; JAMB answer keys are returned only from approved protected answer-key rows. JUPEB retains legacy fallback behavior.';

COMMENT ON FUNCTION public.match_study_questions_text(
  TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT
) IS
  'Service-role-only lexical retrieval; JAMB answer keys are returned only from approved protected answer-key rows. JUPEB retains legacy fallback behavior.';

COMMIT;
