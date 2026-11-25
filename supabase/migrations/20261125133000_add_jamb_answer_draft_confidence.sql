-- Add confidence/evidence metadata for hidden JAMB answer drafts.
-- This migration does not approve, publish, unhide, or rewrite existing questions.
BEGIN;

ALTER TABLE public.study_question_answer_keys
  ADD COLUMN IF NOT EXISTS confidence_level TEXT NOT NULL DEFAULT 'unrated',
  ADD COLUMN IF NOT EXISTS confidence_note TEXT,
  ADD COLUMN IF NOT EXISTS evidence_reference TEXT,
  ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.study_question_answer_keys
  DROP CONSTRAINT IF EXISTS study_question_answer_keys_confidence_level_check,
  DROP CONSTRAINT IF EXISTS study_question_answer_keys_confidence_note_check,
  DROP CONSTRAINT IF EXISTS study_question_answer_keys_draft_version_check;

ALTER TABLE public.study_question_answer_keys
  ADD CONSTRAINT study_question_answer_keys_confidence_level_check
    CHECK (confidence_level IN ('unrated', 'low', 'medium', 'high')),
  ADD CONSTRAINT study_question_answer_keys_confidence_note_check
    CHECK (
      confidence_level = 'unrated'
      OR char_length(btrim(coalesce(confidence_note, ''))) >= 12
    ),
  ADD CONSTRAINT study_question_answer_keys_draft_version_check
    CHECK (draft_version >= 1);

-- An answer-only draft event is not a source-rights attestation. Preserve the
-- existing true-only rule for every other audit operation.
ALTER TABLE public.jamb_question_admin_audit
  DROP CONSTRAINT IF EXISTS jamb_question_admin_audit_operation_check,
  DROP CONSTRAINT IF EXISTS jamb_question_admin_audit_rights_confirmed_check;

ALTER TABLE public.jamb_question_admin_audit
  ADD CONSTRAINT jamb_question_admin_audit_operation_check
    CHECK (operation IN ('create', 'update', 'delete', 'reorder', 'answer-draft-update')),
  ADD CONSTRAINT jamb_question_admin_audit_rights_confirmed_check
    CHECK (
      (operation = 'answer-draft-update' AND rights_confirmed IS FALSE)
      OR (operation <> 'answer-draft-update' AND rights_confirmed IS TRUE)
    );

COMMENT ON COLUMN public.study_question_answer_keys.confidence_level IS
  'Admin-only confidence label for an unapproved JAMB answer draft; not a publication or verification state.';
COMMENT ON COLUMN public.study_question_answer_keys.confidence_note IS
  'Admin-only reasoning behind the confidence label for a JAMB answer draft.';
COMMENT ON COLUMN public.study_question_answer_keys.evidence_reference IS
  'Admin-only source, calculation, passage or evidence reference supporting a JAMB answer draft.';
COMMENT ON COLUMN public.study_question_answer_keys.draft_version IS
  'Monotonic revision number used for optimistic concurrency when saving hidden JAMB answer drafts.';

-- Seed confidence metadata for the five already-existing screenshot candidates.
-- Answer letters, explanations, review states and question visibility are unchanged.
UPDATE public.study_question_answer_keys AS key
SET confidence_level = 'high',
    confidence_note = 'The source wording and standard erythrocyte structure support this option: mature mammalian red cells are biconcave and anucleate.',
    evidence_reference = 'Biology.txt | 2002:Q29 | erythrocyte structure',
    draft_version = GREATEST(key.draft_version, 1),
    updated_at = now()
FROM public.study_questions AS question
WHERE key.question_id = question.id
  AND question.id = 'jamb-3c1c5e62f8a6e28e4b3b105b859f3778'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND key.review_status = 'needs_review';

UPDATE public.study_question_answer_keys AS key
SET confidence_level = 'high',
    confidence_note = 'Hooke’s law gives extension proportional to load: 20/5 = 4, so 0.56 cm × 4 = 2.24 cm, matching option E.',
    evidence_reference = 'Physics.txt | 1981:Q43 | Hooke’s law proportional-extension calculation',
    draft_version = GREATEST(key.draft_version, 1),
    updated_at = now()
FROM public.study_questions AS question
WHERE key.question_id = question.id
  AND question.id = 'jamb-9ed883cce7bf8b970ec263df9d07bbc9'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND key.review_status = 'needs_review';

UPDATE public.study_question_answer_keys AS key
SET confidence_level = 'high',
    confidence_note = 'A 1 kg load exerts 10 N and the 1.2 cm extension is 0.012 m; k = F/x = 10/0.012 ≈ 833 N m⁻¹, matching option B.',
    evidence_reference = 'Physics.txt | 2012:Q15 | k = mg / extension',
    draft_version = GREATEST(key.draft_version, 1),
    updated_at = now()
FROM public.study_questions AS question
WHERE key.question_id = question.id
  AND question.id = 'jamb-3b03182910b2c6d11e0e2dd1b8a0f4bd'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND key.review_status = 'needs_review';

UPDATE public.study_question_answer_keys AS key
SET confidence_level = 'low',
    confidence_note = 'Published past-question answer references conflict on this novel item; keep option D provisional until checked against the novel or a reliable original key.',
    evidence_reference = 'JAMB_english_READABLE.txt | 2013:Q27 | https://www.utmeprep.app/past-questions/english/2013 ; https://www.deeepsolve.com/jamb/english-language/2013',
    draft_version = GREATEST(key.draft_version, 1),
    updated_at = now()
FROM public.study_questions AS question
WHERE key.question_id = question.id
  AND question.id = 'jamb-import-english-2013-q27'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND key.review_status = 'needs_review';

UPDATE public.study_question_answer_keys AS key
SET confidence_level = 'medium',
    confidence_note = 'Official FAA history dates the NAVSTAR GPS programme to 1973, supporting the 1970s option; the original JAMB comprehension passage is still missing.',
    evidence_reference = 'JAMB_english_READABLE.txt | 2016:Q6 | https://www.faa.gov/about/office_org/headquarters_offices/ato/service_units/techops/navservices/gnss/gps',
    draft_version = GREATEST(key.draft_version, 1),
    updated_at = now()
FROM public.study_questions AS question
WHERE key.question_id = question.id
  AND question.id = 'jamb-import-english-2016-q06'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND key.review_status = 'needs_review';

UPDATE public.study_question_answer_keys AS key
SET confidence_level = 'low',
    confidence_note = 'GPS had military and security uses, but the original passage is absent; confirm the passage wording before treating option C as definitive.',
    evidence_reference = 'JAMB_english_READABLE.txt | 2016:Q7 | https://www.faa.gov/about/office_org/headquarters_offices/ato/service_units/techops/navservices/gnss/gps ; https://www.nasa.gov/general/global-positioning-system-history/',
    draft_version = GREATEST(key.draft_version, 1),
    updated_at = now()
FROM public.study_questions AS question
WHERE key.question_id = question.id
  AND question.id = 'jamb-import-english-2016-q07'
  AND question.exam_program_id = 'jamb'
  AND question.hidden IS TRUE
  AND question.review_status = 'needs_review'
  AND key.review_status = 'needs_review';

COMMIT;
