-- Ensure leaderboard reads obey the caller's permissions and score_events RLS.
-- The view remains readable by authenticated users through its existing grant,
-- but anonymous callers no longer inherit the view owner's table privileges.
ALTER VIEW public.current_leaderboard SET (security_invoker = true);
