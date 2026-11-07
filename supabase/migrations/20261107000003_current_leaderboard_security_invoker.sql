-- Anonymous users do not need access to this authenticated leaderboard view.
-- Remove inherited/default privileges, then grant only the read path required by
-- the app. This is an aggregate view and must never be a write endpoint.
REVOKE ALL ON TABLE public.current_leaderboard FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.current_leaderboard
  FROM authenticated;
GRANT SELECT ON TABLE public.current_leaderboard TO authenticated, service_role;

-- Ensure leaderboard reads obey the caller's permissions and score_events RLS.
ALTER VIEW public.current_leaderboard SET (security_invoker = true);
