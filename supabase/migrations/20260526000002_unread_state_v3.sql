-- ============================================================
-- Migration: Unread State v3 — last_read_at + server-side RPC
-- ============================================================

-- 1. Add last_read_at to conversation_participants
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- Set default for existing rows so old messages don't flood as unread
UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE last_read_at IS NULL;

ALTER TABLE public.conversation_participants
  ALTER COLUMN last_read_at SET NOT NULL;

-- 2. RPC: get_unread_counts — single-query server-side count per conversation
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.conversation_id, COUNT(*)::BIGINT
  FROM public.messages m
  JOIN public.conversation_participants cp
    ON cp.conversation_id = m.conversation_id
   AND cp.user_id = p_user_id
  WHERE m.sender_id != p_user_id
    AND m.created_at > cp.last_read_at
    AND (m.is_deleted IS NULL OR m.is_deleted = false)
    AND m.message_type != 'system'
  GROUP BY m.conversation_id;
$$;

-- 3. RPC: mark_conversation_read — sets last_read_at = now()
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  UPDATE public.conversation_participants
    SET last_read_at = v_now
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;
  RETURN v_now;
END;
$$;

-- 4. Grant execute to anon/authenticated
GRANT EXECUTE ON FUNCTION public.get_unread_counts TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read TO authenticated;
