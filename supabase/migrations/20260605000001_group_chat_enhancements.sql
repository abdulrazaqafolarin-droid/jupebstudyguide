-- ============================================================
-- Migration: Group Chat Enhancements — RLS, admin, unread fix
-- ============================================================

-- 1. Add created_by to conversations for admin tracking
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill created_by for existing groups: first participant wins
UPDATE public.conversations c
  SET created_by = sub.first_user
  FROM (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      cp.user_id AS first_user
    FROM public.conversation_participants cp
    ORDER BY cp.conversation_id, cp.joined_at ASC
  ) sub
  WHERE c.id = sub.conversation_id
    AND c.created_by IS NULL;

-- 2. DELETE RLS for conversations
--    DM: either participant can delete
--    Group: only created_by can delete
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
  AND (
    created_by IS NULL
    OR created_by = auth.uid()
  )
);

-- 3. DELETE RLS for conversation_participants (leave + kick)
DROP POLICY IF EXISTS "Users can manage participants" ON public.conversation_participants;
CREATE POLICY "Users can manage participants"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    conversation_id IN (
      SELECT c2.id FROM public.conversations c2
      WHERE c2.created_by = auth.uid()
    )
  )
);

-- 4. DELETE RLS for messages (sender or group admin)
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  OR (
    conversation_id IN (
      SELECT c3.id FROM public.conversations c3
      WHERE c3.created_by = auth.uid()
    )
  )
);

-- 5. Fix maintain_unread_counts trigger: skip groups with >2 participants
--    (stored unread_count_a/b only make sense for 2-person conversations)
CREATE OR REPLACE FUNCTION public.maintain_unread_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part_a UUID;
  v_part_b UUID;
  v_participant_count INTEGER;
  v_conv_id UUID;
  v_sender_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_conv_id := NEW.conversation_id;
    v_sender_id := NEW.sender_id;
    IF NEW.message_type = 'system' OR NEW.is_deleted THEN
      RETURN NEW;
    END IF;

    -- Count participants; skip groups (>2)
    SELECT COUNT(*) INTO v_participant_count
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;
    IF v_participant_count > 2 THEN
      RETURN NEW;
    END IF;

    SELECT MIN(cp.user_id), MAX(cp.user_id)
      INTO v_part_a, v_part_b
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;
    IF v_part_a IS NULL OR v_part_b IS NULL THEN
      RETURN NEW;
    END IF;

    IF v_sender_id = v_part_a THEN
      UPDATE public.conversations
        SET unread_count_b = unread_count_b + 1
        WHERE id = v_conv_id;
    ELSIF v_sender_id = v_part_b THEN
      UPDATE public.conversations
        SET unread_count_a = unread_count_a + 1
        WHERE id = v_conv_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_conv_id := NEW.conversation_id;

    SELECT COUNT(*) INTO v_participant_count
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;
    IF v_participant_count > 2 THEN
      RETURN NEW;
    END IF;

    SELECT MIN(cp.user_id), MAX(cp.user_id)
      INTO v_part_a, v_part_b
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;

    IF NEW.is_deleted AND NOT OLD.is_deleted AND NOT OLD.is_read THEN
      IF OLD.sender_id = v_part_a THEN
        UPDATE public.conversations SET unread_count_b = GREATEST(unread_count_b - 1, 0) WHERE id = v_conv_id;
      ELSIF OLD.sender_id = v_part_b THEN
        UPDATE public.conversations SET unread_count_a = GREATEST(unread_count_a - 1, 0) WHERE id = v_conv_id;
      END IF;
    END IF;

    IF NEW.is_read AND NOT OLD.is_read THEN
      IF OLD.sender_id = v_part_a THEN
        UPDATE public.conversations SET unread_count_b = GREATEST(unread_count_b - 1, 0) WHERE id = v_conv_id;
      ELSIF OLD.sender_id = v_part_b THEN
        UPDATE public.conversations SET unread_count_a = GREATEST(unread_count_a - 1, 0) WHERE id = v_conv_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_conv_id := OLD.conversation_id;

    SELECT COUNT(*) INTO v_participant_count
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;
    IF v_participant_count > 2 THEN
      RETURN OLD;
    END IF;

    SELECT MIN(cp.user_id), MAX(cp.user_id)
      INTO v_part_a, v_part_b
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;

    IF NOT OLD.is_read AND NOT OLD.is_deleted AND OLD.message_type != 'system' THEN
      IF OLD.sender_id = v_part_a THEN
        UPDATE public.conversations SET unread_count_b = GREATEST(unread_count_b - 1, 0) WHERE id = v_conv_id;
      ELSIF OLD.sender_id = v_part_b THEN
        UPDATE public.conversations SET unread_count_a = GREATEST(unread_count_a - 1, 0) WHERE id = v_conv_id;
      END IF;
    END IF;

    RETURN OLD;
  END IF;
END;
$$;

-- 6. Fix mark_conversation_read: use last_read_at for all (simpler, works for groups)
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
  v_now TIMESTAMPTZ := now();
  v_unread_count INTEGER;
  v_part_a UUID;
  v_part_b UUID;
BEGIN
  UPDATE public.conversation_participants
    SET last_read_at = v_now
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;

  SELECT MIN(cp.user_id), MAX(cp.user_id)
    INTO v_part_a, v_part_b
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id;

  IF p_user_id = v_part_a THEN
    UPDATE public.conversations SET unread_count_a = 0 WHERE id = p_conversation_id;
  ELSIF p_user_id = v_part_b THEN
    UPDATE public.conversations SET unread_count_b = 0 WHERE id = p_conversation_id;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_unread_count
    FROM public.messages m
    JOIN public.conversation_participants cp
      ON cp.conversation_id = m.conversation_id AND cp.user_id = p_user_id
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_id != p_user_id
      AND m.created_at > cp.last_read_at
      AND (m.is_deleted IS NULL OR m.is_deleted = false)
      AND m.message_type != 'system';

  RETURN jsonb_build_object('unread_count', v_unread_count, 'last_read_at', v_now);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read TO authenticated;
