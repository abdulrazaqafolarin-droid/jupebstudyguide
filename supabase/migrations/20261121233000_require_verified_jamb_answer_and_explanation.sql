-- JAMB approval/publication requires a verified correct option and an explanation.
-- Ungraded approval is intentionally disallowed for the JAMB question bank.
BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_jamb_question_approval_completeness()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_exam_program_id TEXT;
  v_answer TEXT;
  v_options JSONB;
  v_explanation TEXT;
BEGIN
  SELECT batch.exam_program_id
    INTO v_exam_program_id
    FROM public.question_import_batches AS batch
   WHERE batch.id = NEW.batch_id;

  IF v_exam_program_id IS DISTINCT FROM 'jamb' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved_ungraded' THEN
    RAISE EXCEPTION
      'JAMB questions cannot be approved ungraded. Add and independently verify the correct answer and explanation first.';
  END IF;

  IF NEW.status IN ('approved', 'published') THEN
    v_answer := upper(btrim(coalesce(NEW.normalized_payload->>'correct_answer', '')));
    v_options := NEW.normalized_payload->'options';
    v_explanation := btrim(coalesce(NEW.normalized_payload->>'explanation', ''));

    IF coalesce(NEW.normalized_payload->>'answer_key_verified', 'false') <> 'true' THEN
      RAISE EXCEPTION 'A verified JAMB answer key is required before approval or publication';
    END IF;

    IF v_answer NOT IN ('A', 'B', 'C', 'D', 'E') OR v_answer = '' THEN
      RAISE EXCEPTION 'The JAMB answer key must identify a valid option label';
    END IF;

    IF jsonb_typeof(v_options) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'JAMB options must be an array before approval';
    END IF;

    IF jsonb_array_length(v_options) NOT IN (4, 5) THEN
      RAISE EXCEPTION 'Four or five JAMB options are required before approval';
    END IF;

    IF NOT EXISTS (
      SELECT 1
        FROM jsonb_array_elements(v_options) AS option_row(value)
       WHERE upper(coalesce(option_row.value->>'label', '')) = v_answer
    ) THEN
      RAISE EXCEPTION 'The verified JAMB answer must match one of the saved options';
    END IF;

    IF char_length(v_explanation) < 12 THEN
      RAISE EXCEPTION 'A meaningful explanation is required before a JAMB question can be approved or published';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_jamb_question_approval_completeness
  ON public.question_import_items;

CREATE TRIGGER enforce_jamb_question_approval_completeness
  BEFORE INSERT OR UPDATE OF status, normalized_payload
  ON public.question_import_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_jamb_question_approval_completeness();

CREATE OR REPLACE FUNCTION public.enforce_jamb_answer_key_completeness()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_exam_program_id TEXT;
  v_options JSONB;
  v_answer TEXT;
BEGIN
  SELECT question.exam_program_id, question.options
    INTO v_exam_program_id, v_options
    FROM public.study_questions AS question
   WHERE question.id = NEW.question_id;

  IF v_exam_program_id IS DISTINCT FROM 'jamb' THEN
    RETURN NEW;
  END IF;

  IF char_length(btrim(coalesce(NEW.explanation, ''))) < 12 THEN
    RAISE EXCEPTION 'A meaningful explanation is required for every published JAMB answer key';
  END IF;

  v_answer := upper(btrim(coalesce(NEW.correct_answer, '')));
  IF v_answer NOT IN ('A', 'B', 'C', 'D', 'E') OR v_answer = '' THEN
    RAISE EXCEPTION 'The JAMB answer key must identify a valid option label';
  END IF;

  IF jsonb_typeof(v_options) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'The JAMB question must contain an options array before its answer key is saved';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(v_options) AS option_row(value)
     WHERE upper(coalesce(option_row.value->>'label', '')) = v_answer
  ) THEN
    RAISE EXCEPTION 'The correct JAMB answer must match one of the saved options';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_jamb_answer_key_completeness
  ON public.study_question_answer_keys;

CREATE TRIGGER enforce_jamb_answer_key_completeness
  BEFORE INSERT OR UPDATE OF question_id, correct_answer, explanation
  ON public.study_question_answer_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_jamb_answer_key_completeness();

COMMENT ON FUNCTION public.enforce_jamb_question_approval_completeness() IS
  'Blocks ungraded JAMB approval and requires a verified option plus meaningful explanation before approval/publication.';

COMMENT ON FUNCTION public.enforce_jamb_answer_key_completeness() IS
  'Requires every JAMB answer-key record to contain an option that exists on its question and a meaningful explanation.';

COMMIT;
