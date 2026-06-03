-- Atomic find-or-create DM conversation (prevents duplicate DMs)
CREATE OR REPLACE FUNCTION public.find_or_create_dm(
  other_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conv_id uuid;
  new_conv_id uuid;
BEGIN
  -- Prevents self-DM
  IF auth.uid() = other_user_id THEN
    RETURN jsonb_build_object('error', 'Cannot create DM with yourself');
  END IF;

  -- Lock conversation_participants to prevent race conditions
  -- This ensures only one session can insert a DM at a time
  PERFORM pg_advisory_xact_lock(hashtext('find_or_create_dm_' || least(auth.uid()::text, other_user_id::text) || '_' || greatest(auth.uid()::text, other_user_id::text)));

  -- Find existing 2-person conversation between these two users
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = cp1.conversation_id
    ) = 2
  LIMIT 1;

  -- If found, return it
  IF existing_conv_id IS NOT NULL THEN
    RETURN jsonb_build_object('conversation_id', existing_conv_id);
  END IF;

  -- Create new conversation
  new_conv_id := gen_random_uuid();
  INSERT INTO public.conversations (id, created_at, updated_at)
  VALUES (new_conv_id, now(), now());

  INSERT INTO public.conversation_participants (conversation_id, user_id, last_read_at)
  VALUES
    (new_conv_id, auth.uid(), now()),
    (new_conv_id, other_user_id, now());

  RETURN jsonb_build_object('conversation_id', new_conv_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_or_create_dm(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_dm(uuid) TO authenticated;

-- Atomic handle friend request with row-level lock and auto-create DM on accept
CREATE OR REPLACE FUNCTION public.handle_friend_request(
  request_id uuid,
  accept boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fr record;
  existing_conv_id uuid;
  new_conv_id uuid;
BEGIN
  -- Lock the friend_request row to prevent race conditions
  SELECT * INTO fr
  FROM public.friend_requests
  WHERE id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Friend request not found');
  END IF;

  IF fr.receiver_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to respond to this request');
  END IF;

  IF fr.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Friend request is not pending');
  END IF;

  IF accept THEN
    UPDATE public.friend_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = request_id;

    -- Auto-create DM using same pattern as find_or_create_dm
    PERFORM pg_advisory_xact_lock(hashtext('find_or_create_dm_' || least(fr.sender_id::text, fr.receiver_id::text) || '_' || greatest(fr.sender_id::text, fr.receiver_id::text)));

    SELECT cp1.conversation_id INTO existing_conv_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
    WHERE cp1.user_id = fr.sender_id
      AND cp2.user_id = fr.receiver_id
      AND (
        SELECT COUNT(*) FROM conversation_participants cp3
        WHERE cp3.conversation_id = cp1.conversation_id
      ) = 2
    LIMIT 1;

    IF existing_conv_id IS NULL THEN
      new_conv_id := gen_random_uuid();
      INSERT INTO public.conversations (id, created_at, updated_at)
      VALUES (new_conv_id, now(), now());

      INSERT INTO public.conversation_participants (conversation_id, user_id, last_read_at)
      VALUES
        (new_conv_id, fr.sender_id, now()),
        (new_conv_id, fr.receiver_id, now());

      RETURN jsonb_build_object('success', true, 'conversation_id', new_conv_id);
    END IF;

    RETURN jsonb_build_object('success', true, 'conversation_id', existing_conv_id);
  ELSE
    UPDATE public.friend_requests
    SET status = 'rejected', updated_at = now()
    WHERE id = request_id;

    RETURN jsonb_build_object('success', true, 'conversation_id', null);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_friend_request(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_friend_request(uuid, boolean) TO authenticated;
