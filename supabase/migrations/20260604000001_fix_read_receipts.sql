-- ============================================================
-- Migration: Fix Read Receipts — per-message is_read + delivered_at
-- ============================================================
-- Problem: mark_conversation_read only updates last_read_at on
-- conversation_participants. The on_message_read trigger (which
-- sets read_at/delivered_at) fires on is_read column changes,
-- but is_read is never set to true at message level.
--
-- Fix: Update mark_conversation_read RPC to also set is_read=true
-- on all unread messages from other users in the conversation.
-- The existing on_message_read trigger will auto-set read_at/delivered_at.
-- ============================================================

DROP FUNCTION IF EXISTS public.mark_conversation_read(UUID, UUID);
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part_a UUID;
  v_part_b UUID;
  v_now TIMESTAMPTZ := now();
  v_unread_count INTEGER;
BEGIN
  -- 1. Get ordered participants
  SELECT (array_agg(cp.user_id ORDER BY cp.user_id))[1], (array_agg(cp.user_id ORDER BY cp.user_id DESC))[1]
    INTO v_part_a, v_part_b
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id;

  -- 2. Update last_read_at on conversation_participants
  UPDATE public.conversation_participants
    SET last_read_at = v_now
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;

  -- 3. Set is_read = true on ALL unread messages from OTHER users
  --    The on_message_read trigger (update_message_delivery_status)
  --    will auto-populate read_at and delivered_at on the same update.
  UPDATE public.messages
    SET is_read = true
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND is_read = false
      AND (is_deleted IS NULL OR is_deleted = false)
      AND message_type != 'system';

  -- 4. Zero out stored unread counts
  IF p_user_id = v_part_a THEN
    UPDATE public.conversations
      SET unread_count_a = 0
      WHERE id = p_conversation_id;
    v_unread_count := 0;
  ELSIF p_user_id = v_part_b THEN
    UPDATE public.conversations
      SET unread_count_b = 0
      WHERE id = p_conversation_id;
    v_unread_count := 0;
  ELSE
    SELECT COUNT(*)::INTEGER INTO v_unread_count
      FROM public.messages m
      JOIN public.conversation_participants cp
        ON cp.conversation_id = m.conversation_id AND cp.user_id = p_user_id
      WHERE m.conversation_id = p_conversation_id
        AND m.sender_id != p_user_id
        AND m.created_at > cp.last_read_at
        AND (m.is_deleted IS NULL OR m.is_deleted = false)
        AND m.message_type != 'system';
  END IF;

  RETURN jsonb_build_object('unread_count', v_unread_count, 'last_read_at', v_now);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read TO authenticated;
