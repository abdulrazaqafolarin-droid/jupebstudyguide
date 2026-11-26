-- Trigger functions are invoked by PostgreSQL trigger machinery, not as client RPCs.
-- Keep the SECURITY DEFINER queue-maintenance function unavailable to API roles.
REVOKE ALL ON FUNCTION public.enqueue_study_question_embedding()
  FROM PUBLIC, anon, authenticated, service_role;
