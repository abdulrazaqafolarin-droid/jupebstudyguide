BEGIN;

CREATE TABLE IF NOT EXISTS public.exam_user_syllabus_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'not_started',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_program_id, topic_id),
  CONSTRAINT exam_user_syllabus_progress_program_check CHECK (exam_program_id = 'jamb'),
  CONSTRAINT exam_user_syllabus_progress_topic_id_check CHECK (length(trim(topic_id)) BETWEEN 1 AND 160),
  CONSTRAINT exam_user_syllabus_progress_state_check CHECK (state IN ('not_started', 'in_progress', 'completed'))
);

CREATE INDEX IF NOT EXISTS exam_user_syllabus_progress_user_updated_idx
  ON public.exam_user_syllabus_progress (user_id, exam_program_id, updated_at DESC);

ALTER TABLE public.exam_user_syllabus_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.exam_user_syllabus_progress FROM anon, PUBLIC, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_user_syllabus_progress TO authenticated;

DROP POLICY IF EXISTS exam_user_syllabus_progress_owner_all
  ON public.exam_user_syllabus_progress;

CREATE POLICY exam_user_syllabus_progress_owner_all
  ON public.exam_user_syllabus_progress
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
