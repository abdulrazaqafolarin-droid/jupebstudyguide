BEGIN;

CREATE TABLE IF NOT EXISTS public.exam_user_study_sessions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id) ON DELETE CASCADE,
  sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_program_id),
  CONSTRAINT exam_user_study_sessions_program_check CHECK (exam_program_id = 'jamb'),
  CONSTRAINT exam_user_study_sessions_shape_check CHECK (jsonb_typeof(sessions) = 'array')
);

CREATE INDEX IF NOT EXISTS exam_user_study_sessions_updated_idx
  ON public.exam_user_study_sessions (user_id, updated_at DESC);

ALTER TABLE public.exam_user_study_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.exam_user_study_sessions FROM anon, PUBLIC, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_user_study_sessions TO authenticated;

DROP POLICY IF EXISTS exam_user_study_sessions_owner_all
  ON public.exam_user_study_sessions;

CREATE POLICY exam_user_study_sessions_owner_all
  ON public.exam_user_study_sessions
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND exam_program_id = 'jamb'
    AND (SELECT public.current_auth_session_is_active())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND exam_program_id = 'jamb'
    AND (SELECT public.current_auth_session_is_active())
  );

COMMIT;
