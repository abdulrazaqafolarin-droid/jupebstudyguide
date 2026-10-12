-- ============================================================
-- Migration: batched privacy RPC (kills per-user N+1) + perf indexes
-- Date: 2026-10-11
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_view_online_status_many(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, allowed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  FOREACH uid IN ARRAY p_user_ids[1:50] LOOP
    RETURN QUERY SELECT uid, public.can_view_online_status(uid);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_online_status_many(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_online_status_many(UUID[]) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_score_events_week_user
  ON public.score_events (created_at, user_id) INCLUDE (amount);

CREATE INDEX IF NOT EXISTS idx_cp_user_conv
  ON public.conversation_participants (user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_custom_questions_user
  ON public.custom_questions (user_id, created_at DESC);
