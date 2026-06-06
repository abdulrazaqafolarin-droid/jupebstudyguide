-- DIRECT MESSAGING V2
-- Production-grade 1-to-1 messaging with E2E encryption, message states,
-- disappearing messages, reactions, stars, and delivery receipts.

-- ============================================================
-- 1. USERS EXTENSION (add messaging keys to existing profiles)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_key TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_public_key ON public.profiles(public_key);

-- ============================================================
-- 2. CONVERSATIONS (1-to-1 with participant_a/b)
-- ============================================================
-- Keep existing conversations table for group chats.
-- Add direct_messages for 1-to-1 with the spec schema.
CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_b   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disappear_timer INTERVAL,
  locked          BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dc_unique_participants ON public.direct_conversations (LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b));

CREATE INDEX IF NOT EXISTS idx_dc_participant_a ON public.direct_conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_dc_participant_b ON public.direct_conversations(participant_b);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own direct conversations"
  ON public.direct_conversations FOR SELECT TO authenticated
  USING (participant_a = auth.uid() OR participant_b = auth.uid());

CREATE POLICY "Users can create direct conversations"
  ON public.direct_conversations FOR INSERT TO authenticated
  WITH CHECK (participant_a = auth.uid() OR participant_b = auth.uid());

CREATE POLICY "Users can update their own direct conversations"
  ON public.direct_conversations FOR UPDATE TO authenticated
  USING (participant_a = auth.uid() OR participant_b = auth.uid());

-- ============================================================
-- 3. MESSAGES (bigserial PK, E2E ciphertext, state machine)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id              BIGSERIAL PRIMARY KEY,
  client_msg_id   UUID NOT NULL UNIQUE,
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('text','image','video','audio','document','contact','location','sticker','gif','system')),
  ciphertext      TEXT NOT NULL,
  media_url       TEXT,
  media_meta      JSONB,
  reply_to_id     BIGINT REFERENCES public.direct_messages(id),
  forwarded_hops  SMALLINT NOT NULL DEFAULT 0,
  view_once       BOOLEAN NOT NULL DEFAULT false,
  expires_at      TIMESTAMPTZ,
  edited_at       TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  state           TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','delivered','read')),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation_sent ON public.direct_messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_sender_sent ON public.direct_messages(sender_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_client_msg_id ON public.direct_messages(client_msg_id);
CREATE INDEX IF NOT EXISTS idx_dm_expires ON public.direct_messages(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_conversations dc
      WHERE dc.id = conversation_id
        AND (dc.participant_a = auth.uid() OR dc.participant_b = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations dc
      WHERE dc.id = conversation_id
        AND (dc.participant_a = auth.uid() OR dc.participant_b = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.direct_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- ============================================================
-- 4. MESSAGE EDITS (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_edits (
  id          BIGSERIAL PRIMARY KEY,
  message_id  BIGINT NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  old_cipher  TEXT NOT NULL,
  edited_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edits to their messages"
  ON public.message_edits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_id AND dm.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert edits to their messages"
  ON public.message_edits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_id AND dm.sender_id = auth.uid()
    )
  );

-- ============================================================
-- 5. MESSAGE STATUS (per-recipient delivery/read tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_status (
  id            BIGSERIAL PRIMARY KEY,
  message_id    BIGINT NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  UNIQUE (message_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_recipient ON public.message_status(recipient_id);

ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message status"
  ON public.message_status FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can insert message status"
  ON public.message_status FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Users can update message status for their receipts"
  ON public.message_status FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- ============================================================
-- 6. REACTIONS (upsert per user per message)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.direct_reactions (
  id          BIGSERIAL PRIMARY KEY,
  message_id  BIGINT NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dr_message ON public.direct_reactions(message_id);

ALTER TABLE public.direct_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on their messages"
  ON public.direct_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.direct_conversations dc ON dc.id = dm.conversation_id
      WHERE dm.id = message_id
        AND (dc.participant_a = auth.uid() OR dc.participant_b = auth.uid())
    )
  );

CREATE POLICY "Users can upsert their own reactions"
  ON public.direct_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reactions"
  ON public.direct_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions"
  ON public.direct_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 7. STARRED MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.starred_messages (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id  BIGINT NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  starred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own starred messages"
  ON public.starred_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can star messages"
  ON public.starred_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unstar messages"
  ON public.starred_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 8. BLOCKED USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON public.blocked_users FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ============================================================
-- 9. CHAT KEYS (E2E symmetric keys per participant per conversation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_keys (
  conversation_id  UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_key    TEXT NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.chat_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat keys"
  ON public.chat_keys FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chat keys"
  ON public.chat_keys FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat keys"
  ON public.chat_keys FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 10. REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_status;

-- ============================================================
-- 11. HELPER: GET OR CREATE DIRECT CONVERSATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
  p_user_a UUID,
  p_user_b UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_a UUID;
  v_b UUID;
BEGIN
  v_a := LEAST(p_user_a, p_user_b);
  v_b := GREATEST(p_user_a, p_user_b);

  SELECT id INTO v_conv_id
  FROM public.direct_conversations
  WHERE participant_a = v_a AND participant_b = v_b;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.direct_conversations (participant_a, participant_b)
    VALUES (v_a, v_b)
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN v_conv_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID, UUID) TO authenticated;

-- ============================================================
-- 12. HELPER: GET UNREAD COUNT
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_unread_count(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BIGINT
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.direct_messages dm
  WHERE dm.conversation_id = p_conversation_id
    AND dm.sender_id != p_user_id
    AND dm.state != 'read'
    AND dm.is_deleted = false;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unread_count(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_count(UUID, UUID) TO authenticated;

-- ============================================================
-- 13. EXPIRED MESSAGE CLEANUP (call via cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.direct_messages
  SET is_deleted = true
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_deleted = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_expired_messages() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_expired_messages() TO authenticated;

-- ============================================================
-- 14. TRIGGER: UPDATE conversation.updated_at on new message
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_direct_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.direct_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_direct_message_sent ON public.direct_messages;
CREATE TRIGGER on_direct_message_sent
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_direct_conversation();
