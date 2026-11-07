-- Make the legacy weekly leaderboard view respect the caller's privileges
-- and the underlying score_events row-level security policies.
--
-- The current app uses get_weekly_leaderboard(); this view is retained for
-- compatibility, but must not expose score aggregates through owner privileges.

ALTER VIEW public.current_leaderboard
  SET (security_invoker = true);

COMMENT ON VIEW public.current_leaderboard IS
  'Legacy current-week score aggregate. Runs with caller privileges and respects score_events RLS.';
