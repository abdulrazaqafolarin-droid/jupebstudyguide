-- Secure, one-time actions attached to chat push notifications.
-- The raw token is delivered only to the recipient's device; the database
-- stores its SHA-256 digest and never exposes this table to client roles.

CREATE TABLE IF NOT EXISTS public.notification_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE
    CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  source_message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('reply', 'read')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_action_tokens_expiry_idx
  ON public.notification_action_tokens (expires_at)
  WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS notification_action_tokens_recipient_idx
  ON public.notification_action_tokens (recipient_id, created_at DESC);

ALTER TABLE public.notification_action_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_action_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_action_tokens TO service_role;

-- Atomic, single-use token redemption. The token is action-scoped, user-scoped,
-- conversation-scoped and expires. Replies are normal messages and therefore
-- pass through the existing message triggers, unread counters and Realtime.
CREATE OR REPLACE FUNCTION public.consume_notification_action(
  p_token_hash TEXT,
  p_action TEXT,
  p_content TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token public.notification_action_tokens%ROWTYPE;
  v_content TEXT;
  v_message_id UUID;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
     OR p_action NOT IN ('reply', 'read') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid-action');
  END IF;

  IF p_action = 'reply' THEN
    v_content := btrim(COALESCE(p_content, ''));
    IF length(v_content) < 1 OR length(v_content) > 2000 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid-message');
    END IF;
  END IF;

  SELECT *
    INTO v_token
    FROM public.notification_action_tokens
    WHERE token_hash = p_token_hash
      AND action = p_action
    FOR UPDATE;

  IF NOT FOUND
     OR v_token.consumed_at IS NOT NULL
     OR v_token.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired-or-used');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = v_token.conversation_id
      AND cp.user_id = v_token.recipient_id
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.messages source_message
    WHERE source_message.id = v_token.source_message_id
      AND source_message.conversation_id = v_token.conversation_id
      AND source_message.sender_id <> v_token.recipient_id
      AND COALESCE(source_message.is_deleted, false) = false
  ) THEN
    UPDATE public.notification_action_tokens
      SET consumed_at = now()
      WHERE id = v_token.id;
    RETURN jsonb_build_object('ok', false, 'error', 'not-a-participant');
  END IF;

  UPDATE public.notification_action_tokens
    SET consumed_at = now()
    WHERE id = v_token.id;

  IF p_action = 'read' THEN
    PERFORM public.mark_conversation_read(
      v_token.conversation_id,
      v_token.recipient_id
    );
    RETURN jsonb_build_object('ok', true, 'action', 'read');
  END IF;

  v_message_id := gen_random_uuid();
  INSERT INTO public.messages (
    id,
    conversation_id,
    sender_id,
    content,
    message_type,
    reply_to_id,
    client_msg_id
  )
  VALUES (
    v_message_id,
    v_token.conversation_id,
    v_token.recipient_id,
    v_content,
    'text',
    v_token.source_message_id,
    gen_random_uuid()
  );

  -- A reply means the conversation has been opened/responded to, so mark
  -- the incoming thread read as part of the same transaction.
  PERFORM public.mark_conversation_read(
    v_token.conversation_id,
    v_token.recipient_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'action', 'reply',
    'message_id', v_message_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_notification_action(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_notification_action(TEXT, TEXT, TEXT)
  TO service_role;

-- Bound table growth; old/consumed rows are no longer redeemable.
DELETE FROM public.notification_action_tokens
WHERE expires_at < now() - interval '7 days'
   OR consumed_at < now() - interval '7 days';
