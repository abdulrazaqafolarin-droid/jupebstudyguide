-- JAMB daily practice mission history.
-- This is a separate table so JUPEB daily_missions rows and mission schema
-- remain untouched. Mission JSON stores learner selections and score metadata
-- returned after the JAMB exam-practice endpoint validates an answer; it never
-- contains unpublished source content or answer keys.
BEGIN;

CREATE TABLE IF NOT EXISTS public.jamb_daily_missions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('physics', 'chemistry', 'biology')),
  mission JSONB NOT NULL CHECK (jsonb_typeof(mission) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date, subject)
);

ALTER TABLE public.jamb_daily_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jamb_daily_missions_owner_all ON public.jamb_daily_missions;
CREATE POLICY jamb_daily_missions_owner_all
  ON public.jamb_daily_missions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jamb_daily_missions TO authenticated;

COMMENT ON TABLE public.jamb_daily_missions IS
  'Private JAMB-only daily practice mission history; separate from JUPEB daily_missions.';

COMMIT;
