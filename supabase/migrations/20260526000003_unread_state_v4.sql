-- ============================================================
-- Migration: Unread State v4 — stored unread_count_a/b on conversations
-- ============================================================

-- 1. Add stored unread count columns
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS unread_count_a INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_count_b INTEGER NOT NULL DEFAULT 0;

-- 2. Trigger function: maintain unread_count_a/b on message changes
CREATE OR REPLACE FUNCTION public.maintain_unread_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part_a UUID;
  v_part_b UUID;
  v_count_a INTEGER := 0;
  v_count_b INTEGER := 0;
  v_conv_id UUID;
  v_sender_id UUID;
  v_is_unread BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_conv_id := NEW.conversation_id;
    v_sender_id := NEW.sender_id;
    -- Skip system messages and deleted messages
    IF NEW.message_type = 'system' OR NEW.is_deleted THEN
      RETURN NEW;
    END IF;
    -- Get ordered participants
    SELECT (array_agg(cp.user_id ORDER BY cp.user_id))[1], (array_agg(cp.user_id ORDER BY cp.user_id DESC))[1]
      INTO v_part_a, v_part_b
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;
    IF v_part_a IS NULL OR v_part_b IS NULL THEN
      RETURN NEW;
    END IF;
    -- Increment for the non-sender
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
    v_sender_id := NEW.sender_id;

    SELECT (array_agg(cp.user_id ORDER BY cp.user_id))[1], (array_agg(cp.user_id ORDER BY cp.user_id DESC))[1]
      INTO v_part_a, v_part_b
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = v_conv_id;

    -- Handle is_deleted flip: true → unread message removed
    IF NEW.is_deleted AND NOT OLD.is_deleted AND NOT OLD.is_read THEN
      IF OLD.sender_id = v_part_a THEN
        UPDATE public.conversations SET unread_count_b = GREATEST(unread_count_b - 1, 0) WHERE id = v_conv_id;
      ELSIF OLD.sender_id = v_part_b THEN
        UPDATE public.conversations SET unread_count_a = GREATEST(unread_count_a - 1, 0) WHERE id = v_conv_id;
      END IF;
    END IF;

    -- Handle is_read becoming true (legacy path — should not happen with v3 RPC but handle gracefully)
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

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_maintain_unread_counts ON public.messages;
CREATE TRIGGER trg_maintain_unread_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.maintain_unread_counts();

-- 4. Backfill existing unread counts
WITH participant_order AS (
  SELECT
    cp.conversation_id,
    (array_agg(cp.user_id ORDER BY cp.user_id))[1] AS part_a,
    (array_agg(cp.user_id ORDER BY cp.user_id DESC))[1] AS part_b
  FROM public.conversation_participants cp
  GROUP BY cp.conversation_id
),
unread_a AS (
  SELECT m.conversation_id, COUNT(*) AS cnt
  FROM public.messages m
  JOIN participant_order po ON po.conversation_id = m.conversation_id
  WHERE m.sender_id = po.part_b
    AND m.is_read = false
    AND (m.is_deleted IS NULL OR m.is_deleted = false)
    AND m.message_type != 'system'
  GROUP BY m.conversation_id
),
unread_b AS (
  SELECT m.conversation_id, COUNT(*) AS cnt
  FROM public.messages m
  JOIN participant_order po ON po.conversation_id = m.conversation_id
  WHERE m.sender_id = po.part_a
    AND m.is_read = false
    AND (m.is_deleted IS NULL OR m.is_deleted = false)
    AND m.message_type != 'system'
  GROUP BY m.conversation_id
)
UPDATE public.conversations c
SET
  unread_count_a = COALESCE(ua.cnt, 0),
  unread_count_b = COALESCE(ub.cnt, 0)
FROM participant_order po
LEFT JOIN unread_a ua ON ua.conversation_id = po.conversation_id
LEFT JOIN unread_b ub ON ub.conversation_id = po.conversation_id
WHERE c.id = po.conversation_id;

-- 5. Update mark_conversation_read RPC to also zero out the stored count
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
  -- Get ordered participants
  SELECT (array_agg(cp.user_id ORDER BY cp.user_id))[1], (array_agg(cp.user_id ORDER BY cp.user_id DESC))[1]
    INTO v_part_a, v_part_b
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id;

  -- Update last_read_at
  UPDATE public.conversation_participants
    SET last_read_at = v_now
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;

  -- Zero out the appropriate stored count
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
    -- Fallback for group participants > 2: compute
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
