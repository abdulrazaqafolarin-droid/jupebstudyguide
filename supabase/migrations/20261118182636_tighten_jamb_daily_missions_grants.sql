REVOKE ALL ON TABLE public.jamb_daily_missions FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.jamb_daily_missions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.jamb_daily_missions TO authenticated;
