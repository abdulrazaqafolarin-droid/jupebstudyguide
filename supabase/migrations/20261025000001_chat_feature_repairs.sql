-- ============================================================
-- Chat feature repairs: read receipts, live reactions, group system messages
-- ============================================================

-- ------------------------------------------------------------
-- 1) Read receipts: restore the per-message is_read flip.
--    20260604000001_fix_read_receipts.sql added it, but
--    20260605000001_group_chat_enhancements.sql redefined the function
--    WITHOUT it — so is_read could never become true, the on_message_read
--    trigger (which sets read_at/delivered_at) never fired, and every
--    message stayed stuck at a single gray check forever.
--    Also hardens the function: the caller may only mark read for
--    themselves, and only inside conversations they participate in.
-- ------------------------------------------------------------
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
  -- Callers may only act as themselves (service-role paths have auth.uid() IS NULL).
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot mark another user''s conversation read';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  UPDATE public.conversation_participants
    SET last_read_at = v_now
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;

  -- The missing step: flip per-message read state. The on_message_read
  -- trigger (BEFORE UPDATE OF is_read) fills read_at/delivered_at.
  UPDATE public.messages
    SET is_read = true
    WHERE conversation_id = p_conversation_id
      AND sender_id <> p_user_id
      AND is_read = false
      AND (is_deleted IS NULL OR is_deleted = false)
      AND message_type <> 'system';

  -- NOTE: Postgres (pre-17) has no min(uuid)/max(uuid) aggregates — the
  -- earlier MIN/MAX form made this function fail with 42883, breaking the
  -- whole mark-read. Pick the first/last participant with ORDER BY instead.
  SELECT user_id INTO v_part_a
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
    ORDER BY user_id
    LIMIT 1;
  SELECT user_id INTO v_part_b
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
    ORDER BY user_id DESC
    LIMIT 1;

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
      AND m.sender_id <> p_user_id
      AND m.created_at > cp.last_read_at
      AND (m.is_deleted IS NULL OR is_deleted = false)
      AND m.message_type <> 'system';

  RETURN jsonb_build_object('unread_count', v_unread_count, 'last_read_at', v_now);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------
-- 2) Reactions: SECURITY DEFINER toggle so users can react to OTHER
--    people's messages. The only UPDATE policy on messages is
--    "sender owns the row", so the old client-side update silently
--    matched 0 rows (no error) for anyone else's message — the reaction
--    appeared optimistically, then vanished on reload.
--    Atomic under row lock; returns the server-truth reactions object.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_reactions JSONB;
  v_users JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_emoji IS NULL OR length(p_emoji) = 0 OR length(p_emoji) > 16 THEN
    RAISE EXCEPTION 'Invalid emoji';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    JOIN public.messages m ON m.conversation_id = cp.conversation_id
    WHERE m.id = p_message_id AND cp.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  SELECT COALESCE(reactions, '{}'::jsonb) INTO v_reactions
  FROM public.messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF v_reactions IS NULL THEN
    v_reactions := '{}'::jsonb;
  END IF;

  v_users := v_reactions -> p_emoji;
  IF jsonb_typeof(v_users) IS DISTINCT FROM 'array' THEN
    v_users := '[]'::jsonb;
  END IF;

  IF v_users ? v_uid::text THEN
    v_users := v_users - v_uid::text;
  ELSE
    v_users := v_users || jsonb_build_array(v_uid::text);
  END IF;

  IF jsonb_array_length(v_users) = 0 THEN
    v_reactions := v_reactions - p_emoji;
  ELSE
    v_reactions := v_reactions || jsonb_build_object(p_emoji, v_users);
  END IF;

  UPDATE public.messages
    SET reactions = v_reactions
    WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 3) Admin-only groups: non-admins must still be able to leave.
--    20261011000001_security_hardening.sql routes EVERY insert through
--    the messages_policy admins check (using auth.jwt()->>'role', which
--    stays 'authenticated' inside SECURITY DEFINER functions), which broke
--    insert_group_system_message for members leaving an admins-only group.
--    Mark the RPC's insert with a transaction-local GUC and let the
--    trigger accept exactly that case — PostgREST clients cannot set it,
--    so spoofing system rows stays blocked.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_group_system_message(
  p_conversation_id UUID,
  p_message_type TEXT,
  p_content TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.system_insert', '1', true);
  INSERT INTO public.messages (conversation_id, sender_id, message_type, content)
  VALUES (p_conversation_id, auth.uid(), p_message_type, p_content);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_message_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy TEXT;
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Only the insert_group_system_message RPC can bypass the admins check,
  -- and only for genuine system rows.
  IF NEW.message_type = 'system' AND current_setting('app.system_insert', true) = '1' THEN
    RETURN NEW;
  END IF;
  SELECT messages_policy INTO v_policy
  FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_policy = 'admins' AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id = auth.uid()
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can send messages in this group';
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4) maintain_unread_counts: the DELETE branch called MIN(uuid)/MAX(uuid),
--    aggregates that do not exist in Postgres (<17). Every physical
--    messages DELETE — and every conversation delete that cascades into
--    messages (Delete Group, etc.) — failed with
--    "function min(uuid) does not exist" (surfaced as PostgREST 404 on
--    DELETE). The INSERT/UPDATE branches already use ordered array_agg;
--    align the DELETE branch with them.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.maintain_unread_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    -- Postgres has no min(uuid)/max(uuid) aggregates. The old MIN/MAX form
    -- made every physical messages DELETE (and conversation cascade deletes,
    -- e.g. Delete Group) fail with "function min(uuid) does not exist".
    SELECT (array_agg(cp.user_id ORDER BY cp.user_id))[1], (array_agg(cp.user_id ORDER BY cp.user_id DESC))[1]
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
$function$;
