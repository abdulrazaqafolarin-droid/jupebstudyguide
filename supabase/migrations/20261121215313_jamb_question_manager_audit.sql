-- Private audit trail for the JUPEB-parity JAMB in-place question manager.
-- JAMB question keys, explanations, and source-rights attestations must not be
-- exposed through the learner-facing study_questions API.
BEGIN;

CREATE TABLE IF NOT EXISTS public.jamb_question_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'reorder')),
  source_reference TEXT,
  source_document TEXT,
  rights_confirmed BOOLEAN NOT NULL CHECK (rights_confirmed IS TRUE),
  rights_note TEXT NOT NULL CHECK (char_length(btrim(rights_note)) >= 12),
  payload_sha256 TEXT CHECK (
    payload_sha256 IS NULL OR payload_sha256 ~ '^[a-f0-9]{64}$'
  ),
  before_payload JSONB,
  after_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jamb_question_admin_audit_question_created_idx
  ON public.jamb_question_admin_audit (question_id, created_at DESC)
  WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS jamb_question_admin_audit_actor_created_idx
  ON public.jamb_question_admin_audit (actor_id, created_at DESC);

ALTER TABLE public.jamb_question_admin_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.jamb_question_admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.jamb_question_admin_audit TO service_role;

COMMENT ON TABLE public.jamb_question_admin_audit IS
  'Private service-role-only audit log for manual JAMB question manager changes, source-rights attestations, and answer-key snapshots.';

COMMIT;
