-- One durable mission record per authenticated learner and local calendar date.
-- The local_date is supplied by the client because the mission day follows the learner's timezone.
CREATE TABLE IF NOT EXISTS public.daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  mission JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_missions_user_local_date_key UNIQUE (user_id, local_date)
);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can read their own daily missions" ON public.daily_missions;
CREATE POLICY "Learners can read their own daily missions"
  ON public.daily_missions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can create their own daily missions" ON public.daily_missions;
CREATE POLICY "Learners can create their own daily missions"
  ON public.daily_missions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can update their own daily missions" ON public.daily_missions;
CREATE POLICY "Learners can update their own daily missions"
  ON public.daily_missions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can delete their own daily missions" ON public.daily_missions;
CREATE POLICY "Learners can delete their own daily missions"
  ON public.daily_missions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_missions_user_date_idx
  ON public.daily_missions (user_id, local_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_missions TO authenticated;
