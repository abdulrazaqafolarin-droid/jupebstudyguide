-- ============================================================
-- Migration: Groups + Privacy complete implementation
-- Columns, tables, RPCs, triggers for Sections 3 & 4
-- ============================================================

-- --------------------------------------------------
-- 3.x — System message type for group lifecycle events
-- --------------------------------------------------
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN (
    'text', 'image', 'video', 'audio', 'file', 'location',
    'contact', 'system', 'forwarded', 'vn',
    'group_created', 'group_member_added', 'group_member_removed',
    'group_member_left', 'group_name_changed', 'group_photo_changed',
    'group_admin_promoted', 'group_admin_demoted'
  ));

-- --------------------------------------------------
-- 4.4 — privacy_online_status column
-- --------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_online_status TEXT NOT NULL DEFAULT 'everyone'
  CHECK (privacy_online_status IN ('everyone', 'friends', 'nobody'));

-- --------------------------------------------------
-- 4.6 — privacy_groups column
-- --------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_groups TEXT NOT NULL DEFAULT 'everyone'
  CHECK (privacy_groups IN ('everyone', 'friends', 'nobody'));

-- --------------------------------------------------
-- 4.7 — blocked_users table
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blocks"
  ON public.blocked_users
  FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can see if they are blocked"
  ON public.blocked_users
  FOR SELECT
  USING (blocked_id = auth.uid());

-- --------------------------------------------------
-- 3.4 — Muted conversations table
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.muted_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

ALTER TABLE public.muted_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mute settings"
  ON public.muted_conversations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- --------------------------------------------------
-- RPC: can_view_profile_photo
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_profile_photo(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
BEGIN
  SELECT privacy_avatar INTO v_privacy
  FROM public.profiles WHERE id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- RPC: can_view_online_status
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_online_status(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
BEGIN
  SELECT privacy_online_status INTO v_privacy
  FROM public.profiles WHERE id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- RPC: can_add_to_group
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_add_to_group(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
BEGIN
  SELECT privacy_groups INTO v_privacy
  FROM public.profiles WHERE id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- RPC: block_user
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_blocked_id = auth.uid() THEN RAISE EXCEPTION 'Cannot block yourself'; END IF;
  INSERT INTO public.blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), p_blocked_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

-- --------------------------------------------------
-- RPC: unblock_user
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.blocked_users
  WHERE blocker_id = auth.uid() AND blocked_id = p_blocked_id;
END;
$$;

-- --------------------------------------------------
-- RPC: is_blocked
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = p_target_user_id)
       OR (blocked_id = auth.uid() AND blocker_id = p_target_user_id)
  );
END;
$$;

-- --------------------------------------------------
-- RPC: get_blocked_users
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE (blocked_id UUID, blocked_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT b.blocked_id, b.created_at
  FROM public.blocked_users b
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC;
END;
$$;

-- --------------------------------------------------
-- RPC: get_my_muted_conversations
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_muted_conversations()
RETURNS TABLE (conversation_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT mc.conversation_id
  FROM public.muted_conversations mc
  WHERE mc.user_id = auth.uid();
END;
$$;

-- --------------------------------------------------
-- RPC: toggle_mute_conversation
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_mute_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.muted_conversations WHERE user_id = auth.uid() AND conversation_id = p_conversation_id) THEN
    DELETE FROM public.muted_conversations WHERE user_id = auth.uid() AND conversation_id = p_conversation_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.muted_conversations (user_id, conversation_id) VALUES (auth.uid(), p_conversation_id);
    RETURN TRUE;
  END IF;
END;
$$;

-- --------------------------------------------------
-- RPC is_muted
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_muted(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.muted_conversations
    WHERE user_id = auth.uid() AND conversation_id = p_conversation_id
  );
END;
$$;

-- --------------------------------------------------
-- Update get_last_seen with WhatsApp reciprocal rule
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_last_seen(p_target_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_caller_privacy TEXT;
  v_last_seen TIMESTAMPTZ;
BEGIN
  SELECT privacy_last_seen, last_seen_at INTO v_privacy, v_last_seen
  FROM public.profiles WHERE id = p_target_user_id;

  -- WhatsApp reciprocal rule: if caller hides last_seen from target, caller cannot see target's either
  SELECT privacy_last_seen INTO v_caller_privacy
  FROM public.profiles WHERE id = auth.uid();
  IF v_caller_privacy = 'nobody' THEN RETURN NULL; END IF;
  IF v_caller_privacy = 'friends' THEN
    IF public.get_relationship_status(p_target_user_id, auth.uid()) != 'accepted' THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Now check target's privacy
  IF v_privacy = 'everyone' THEN RETURN v_last_seen; END IF;
  IF v_privacy = 'nobody' THEN RETURN NULL; END IF;
  IF public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted' THEN
    RETURN v_last_seen;
  END IF;
  RETURN NULL;
END;
$$;

-- --------------------------------------------------
-- Update can_view_read_receipts with WhatsApp reciprocal rule
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_read_receipts(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_caller_privacy TEXT;
BEGIN
  -- Reciprocal: if caller has read receipts off, they can't see others'
  SELECT privacy_read_receipts INTO v_caller_privacy
  FROM public.profiles WHERE id = auth.uid();
  IF v_caller_privacy = 'nobody' THEN RETURN FALSE; END IF;

  SELECT privacy_read_receipts INTO v_privacy
  FROM public.profiles WHERE id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- RPC: insert_group_system_message
-- Insert a system message for group lifecycle events
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_group_system_message(
  p_conversation_id UUID,
  p_message_type TEXT,
  p_content TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.messages (conversation_id, sender_id, message_type, content)
  VALUES (p_conversation_id, auth.uid(), p_message_type, p_content);
END;
$$;

-- --------------------------------------------------
-- Auto-promote admin when the only admin leaves
-- Trigger on conversation_participants DELETE
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_promote_admin_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_conversation RECORD;
  v_new_admin_id UUID;
BEGIN
  -- Only for groups (conversations with >2 participants expected)
  SELECT * INTO v_conversation FROM public.conversations WHERE id = OLD.conversation_id;
  IF v_conversation.created_by = OLD.user_id THEN
    -- The admin left; promote the longest-standing member
    SELECT user_id INTO v_new_admin_id
    FROM public.conversation_participants
    WHERE conversation_id = OLD.conversation_id AND user_id != OLD.user_id
    ORDER BY joined_at ASC
    LIMIT 1;
    IF v_new_admin_id IS NOT NULL THEN
      UPDATE public.conversations SET created_by = v_new_admin_id WHERE id = OLD.conversation_id;
      INSERT INTO public.messages (conversation_id, sender_id, message_type, content)
      VALUES (OLD.conversation_id, v_new_admin_id, 'group_admin_promoted',
        'Auto-promoted to admin');
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_promote_admin ON public.conversation_participants;
CREATE TRIGGER trg_auto_promote_admin
  AFTER DELETE ON public.conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_admin_on_leave();

-- --------------------------------------------------
-- RLS: prevent messaging blocked users
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_message_user(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = p_target_user_id)
       OR (blocked_id = auth.uid() AND blocker_id = p_target_user_id)
  );
END;
$$;
