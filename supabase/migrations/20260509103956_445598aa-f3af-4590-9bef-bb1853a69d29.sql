
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  streak_days INTEGER NOT NULL DEFAULT 0,
  syllabus_completed_days INTEGER NOT NULL DEFAULT 0,
  achievements_count INTEGER NOT NULL DEFAULT 0,
  mastery_avg NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stats viewable by authenticated users"
ON public.user_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own stats"
ON public.user_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own stats"
ON public.user_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_stats_score ON public.user_stats (total_score DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
