-- Reconcile the existing JAMB 2016 MySchoolGist English answer drafts.
-- This changes protected draft answer metadata only. It does not alter question
-- text/options, source-rights attestations, learner visibility, or approval state.

BEGIN;

DO $preflight$
DECLARE
  v_q1_count INTEGER;
  v_q4_count INTEGER;
BEGIN
  SELECT count(*) INTO v_q1_count
  FROM public.study_questions AS question
  JOIN public.study_question_answer_keys AS answer_key
    ON answer_key.question_id = question.id
  WHERE question.id = 'jamb-import-english-2016-q01'
    AND question.exam_program_id = 'jamb'
    AND question.source_ref = '2016:Q1'
    AND question.hidden IS TRUE
    AND question.review_status = 'needs_review'
    AND answer_key.review_status = 'needs_review'
    AND answer_key.correct_answer = 'C';

  SELECT count(*) INTO v_q4_count
  FROM public.study_questions AS question
  JOIN public.study_question_answer_keys AS answer_key
    ON answer_key.question_id = question.id
  WHERE question.id = 'jamb-import-english-2016-q04'
    AND question.exam_program_id = 'jamb'
    AND question.source_ref = '2016:Q4'
    AND question.hidden IS TRUE
    AND question.review_status = 'needs_review'
    AND answer_key.review_status = 'needs_review'
    AND answer_key.correct_answer = 'B';

  IF v_q1_count <> 1 OR v_q4_count <> 1 THEN
    RAISE EXCEPTION
      'JAMB 2016 English draft reconciliation stopped: expected exactly one hidden needs_review Q1=C and Q4=B draft (found Q1 %, Q4 %)',
      v_q1_count, v_q4_count;
  END IF;
END;
$preflight$;

-- Record answer-only review events. rights_confirmed=false is intentional:
-- this migration changes answer suggestions, not source-use permission.
INSERT INTO public.jamb_question_admin_audit (
  question_id,
  actor_id,
  operation,
  source_reference,
  source_document,
  rights_confirmed,
  rights_note,
  payload_sha256,
  before_payload,
  after_payload
)
SELECT
  question.id,
  NULL,
  'answer-draft-update',
  question.source_ref,
  question.source_document,
  FALSE,
  'Answer-only correction from the MySchoolGist solution table; no source-rights attestation was made.',
  NULL,
  jsonb_build_object('answer_key', to_jsonb(answer_key)),
  jsonb_build_object(
    'answer_key',
    to_jsonb(answer_key) || jsonb_build_object(
      'explanation',
      'The passage pairs visual (what is seen) with audio (what is heard), so “picture and sound” (C) matches the wording. The MySchoolGist 2016 solution table also lists C. Keep this source-version-specific answer pending admin review.',
      'confidence_level', 'medium',
      'confidence_note',
      'The MySchoolGist 2016 answer table lists C and the passage wording supports picture and sound. A separate answer compilation differs; keep this source-version-specific key unapproved.',
      'evidence_reference',
      'Use of English JAMB Past Questions And Answers.pdf (MySchoolGist) | 2016 Q1 and solution table | https://myschoolgist.com/wp-content/uploads/2024/11/Use-of-English-JAMB-Past-Questions-And-Answers.pdf',
      'draft_version', answer_key.draft_version + 1,
      'updated_at', now()
    ),
    'question_visibility',
    jsonb_build_object('hidden', question.hidden, 'review_status', question.review_status)
  )
FROM public.study_questions AS question
JOIN public.study_question_answer_keys AS answer_key
  ON answer_key.question_id = question.id
WHERE question.id = 'jamb-import-english-2016-q01'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND answer_key.review_status = 'needs_review';

INSERT INTO public.jamb_question_admin_audit (
  question_id,
  actor_id,
  operation,
  source_reference,
  source_document,
  rights_confirmed,
  rights_note,
  payload_sha256,
  before_payload,
  after_payload
)
SELECT
  question.id,
  NULL,
  'answer-draft-update',
  question.source_ref,
  question.source_document,
  FALSE,
  'Answer-only correction from the MySchoolGist solution table; no source-rights attestation was made.',
  NULL,
  jsonb_build_object('answer_key', to_jsonb(answer_key)),
  jsonb_build_object(
    'answer_key',
    to_jsonb(answer_key) || jsonb_build_object(
      'correct_answer', 'C',
      'explanation',
      'The passage discusses film-making as a whole, including planning, production, purpose and audience. The MySchoolGist 2016 solution table gives C: “The Art of Film-making”. A different answer compilation lists B, so retain C as the source-version-specific draft pending admin review.',
      'confidence_level', 'medium',
      'confidence_note',
      'The MySchoolGist 2016 answer table lists C for this exact Q4 wording and option set. A separate compilation lists B; retain the MySchoolGist-specific answer as an unapproved draft.',
      'evidence_reference',
      'Use of English JAMB Past Questions And Answers.pdf (MySchoolGist) | 2016 Q4 and solution table | https://myschoolgist.com/wp-content/uploads/2024/11/Use-of-English-JAMB-Past-Questions-And-Answers.pdf',
      'draft_version', answer_key.draft_version + 1,
      'updated_at', now()
    ),
    'question_visibility',
    jsonb_build_object('hidden', question.hidden, 'review_status', question.review_status)
  )
FROM public.study_questions AS question
JOIN public.study_question_answer_keys AS answer_key
  ON answer_key.question_id = question.id
WHERE question.id = 'jamb-import-english-2016-q04'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND answer_key.review_status = 'needs_review';

UPDATE public.study_question_answer_keys AS answer_key
SET
  explanation = 'The passage pairs visual (what is seen) with audio (what is heard), so “picture and sound” (C) matches the wording. The MySchoolGist 2016 solution table also lists C. Keep this source-version-specific answer pending admin review.',
  confidence_level = 'medium',
  confidence_note = 'The MySchoolGist 2016 answer table lists C and the passage wording supports picture and sound. A separate answer compilation differs; keep this source-version-specific key unapproved.',
  evidence_reference = 'Use of English JAMB Past Questions And Answers.pdf (MySchoolGist) | 2016 Q1 and solution table | https://myschoolgist.com/wp-content/uploads/2024/11/Use-of-English-JAMB-Past-Questions-And-Answers.pdf',
  draft_version = answer_key.draft_version + 1,
  updated_at = now()
FROM public.study_questions AS question
WHERE answer_key.question_id = question.id
  AND question.id = 'jamb-import-english-2016-q01'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND answer_key.review_status = 'needs_review'
  AND answer_key.correct_answer = 'C';

UPDATE public.study_question_answer_keys AS answer_key
SET
  correct_answer = 'C',
  explanation = 'The passage discusses film-making as a whole, including planning, production, purpose and audience. The MySchoolGist 2016 solution table gives C: “The Art of Film-making”. A different answer compilation lists B, so retain C as the source-version-specific draft pending admin review.',
  confidence_level = 'medium',
  confidence_note = 'The MySchoolGist 2016 answer table lists C for this exact Q4 wording and option set. A separate compilation lists B; retain the MySchoolGist-specific answer as an unapproved draft.',
  evidence_reference = 'Use of English JAMB Past Questions And Answers.pdf (MySchoolGist) | 2016 Q4 and solution table | https://myschoolgist.com/wp-content/uploads/2024/11/Use-of-English-JAMB-Past-Questions-And-Answers.pdf',
  draft_version = answer_key.draft_version + 1,
  updated_at = now()
FROM public.study_questions AS question
WHERE answer_key.question_id = question.id
  AND question.id = 'jamb-import-english-2016-q04'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND answer_key.review_status = 'needs_review'
  AND answer_key.correct_answer = 'B';

COMMIT;
