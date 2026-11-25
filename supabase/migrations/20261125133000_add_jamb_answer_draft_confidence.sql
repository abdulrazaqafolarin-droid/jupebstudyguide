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

COMMIT;
