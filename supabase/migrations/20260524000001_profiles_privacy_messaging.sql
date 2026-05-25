-- Module A: Profile privacy, bio, mutual friends
-- Module B: Message soft-delete, delivery status, rich media
-- Module D: Privacy enforcement RLS

-- ============================================================
-- MODULE A: USER PROFILES & RELATIONSHIPS
-- ============================================================

-- Add bio and privacy columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS privacy_avatar TEXT NOT NULL DEFAULT 'everyone' CHECK (privacy_avatar IN ('everyone', 'friends', 'nobody')),
  ADD COLUMN IF NOT EXISTS privacy_profile TEXT NOT NULL DEFAULT 'everyone' CHECK (privacy_profile IN ('everyone', 'friends', 'nobody'));

-- ============================================================
-- MODULE B: CORE REAL-TIME MESSAGING ENGINE
-- ============================================================

-- Add message delivery status, soft-delete, file attachment fields
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS upload_progress REAL DEFAULT 0;

-- Drop the old CHECK constraint if it exists and create a new one
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'file', 'video', 'audio'));

-- ============================================================
-- MODULE A: MUTUAL FRIENDS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_mutual_friends(
  user_a uuid,
  user_b uuid
)
RETURNS TABLE(friend_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.friend_id,
    f.display_name,
    f.avatar_url
  FROM public.get_friends(user_a) f
  WHERE f.friend_id IN (
    SELECT f2.friend_id FROM public.get_friends(user_b) f2
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_mutual_friends(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_mutual_friends(uuid, uuid) TO authenticated;

-- ============================================================
-- MODULE D: PRIVACY ENFORCEMENT – RELATIONSHIP-BASED PROFILE ACCESS
-- ============================================================

-- Function to check relationship status between two users
CREATE OR REPLACE FUNCTION public.get_relationship_status(
  user_a uuid,
  user_b uuid
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT
    CASE
      WHEN fr.status = 'accepted' THEN 'friends'
      WHEN fr.status = 'pending' AND fr.sender_id = user_a THEN 'pending_sent'
      WHEN fr.status = 'pending' AND fr.receiver_id = user_a THEN 'pending_receipt'
      ELSE 'stranger'
    END INTO result
  FROM public.friend_requests fr
  WHERE (fr.sender_id = user_a AND fr.receiver_id = user_b)
     OR (fr.sender_id = user_b AND fr.receiver_id = user_a)
  LIMIT 1;

  RETURN COALESCE(result, 'stranger');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_relationship_status(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_relationship_status(uuid, uuid) TO authenticated;

-- Insert a friend request while respecting block status
CREATE OR REPLACE FUNCTION public.send_friend_request(
  receiver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing RECORD;
  block_check RECORD;
  result jsonb;
BEGIN
  -- Check if blocked
  SELECT fr.status INTO block_check
  FROM public.friend_requests fr
  WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = send_friend_request.receiver_id)
     OR (fr.sender_id = send_friend_request.receiver_id AND fr.receiver_id = auth.uid()))
    AND fr.status = 'blocked'
  LIMIT 1;

  IF FOUND THEN
    IF block_check.status = 'blocked' THEN
      RETURN jsonb_build_object('error', 'Unable to send request');
    END IF;
  END IF;

  -- Check existing request
  SELECT * INTO existing
  FROM public.friend_requests fr
  WHERE fr.sender_id = auth.uid()
    AND fr.receiver_id = send_friend_request.receiver_id
  LIMIT 1;

  IF FOUND THEN
    IF existing.status = 'accepted' THEN
      RETURN jsonb_build_object('error', 'Already friends');
    ELSIF existing.status = 'pending' THEN
      RETURN jsonb_build_object('error', 'Request already sent');
    ELSIF existing.status = 'rejected' THEN
      UPDATE public.friend_requests
      SET status = 'pending', updated_at = now()
      WHERE id = existing.id;
      RETURN jsonb_build_object('success', true);
    END IF;
  END IF;

  INSERT INTO public.friend_requests (sender_id, receiver_id)
  VALUES (auth.uid(), send_friend_request.receiver_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_friend_request(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;

-- Block user function
CREATE OR REPLACE FUNCTION public.block_user(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing RECORD;
BEGIN
  -- Remove any existing friend request
  DELETE FROM public.friend_requests
  WHERE (sender_id = auth.uid() AND receiver_id = block_user.target_user_id)
     OR (sender_id = block_user.target_user_id AND receiver_id = auth.uid());

  -- Insert block record
  INSERT INTO public.friend_requests (sender_id, receiver_id, status)
  VALUES (auth.uid(), block_user.target_user_id, 'blocked')
  ON CONFLICT (sender_id, receiver_id)
  DO UPDATE SET status = 'blocked', updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.block_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

-- Unblock user function
CREATE OR REPLACE FUNCTION public.unblock_user(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.friend_requests
  WHERE sender_id = auth.uid()
    AND receiver_id = unblock_user.target_user_id
    AND status = 'blocked';

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unblock_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- Check if current user can view a profile
CREATE OR REPLACE FUNCTION public.can_view_profile(
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_privacy TEXT;
  relationship TEXT;
BEGIN
  SELECT privacy_profile INTO target_privacy
  FROM public.profiles
  WHERE user_id = can_view_profile.target_user_id;

  IF target_privacy = 'everyone' THEN
    RETURN true;
  END IF;

  IF target_privacy = 'nobody' THEN
    RETURN false;
  END IF;

  -- 'friends' only
  SELECT get_relationship_status(auth.uid(), can_view_profile.target_user_id)
  INTO relationship;

  RETURN relationship = 'friends';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

-- ============================================================
-- MESSAGE DELIVERY STATUS UPDATE TRIGGER
-- ============================================================

-- When a message is read, set read_at and delivered_at if not set
CREATE OR REPLACE FUNCTION public.update_message_delivery_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = COALESCE(NEW.read_at, now());
    NEW.delivered_at = COALESCE(NEW.delivered_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_read
  BEFORE UPDATE OF is_read ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_message_delivery_status();

-- ============================================================
-- UPDATED FRIENDS LIST FUNCTION (adds is_blocked awareness)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_friends(user_id uuid)
RETURNS TABLE(friend_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END,
    p.display_name,
    p.avatar_url
  FROM public.friend_requests fr
  JOIN public.profiles p
    ON p.user_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END
  WHERE (fr.sender_id = get_friends.user_id OR fr.receiver_id = get_friends.user_id)
    AND fr.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests b
      WHERE b.status = 'blocked'
        AND ((b.sender_id = get_friends.user_id AND b.receiver_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END)
          OR (b.sender_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END AND b.receiver_id = get_friends.user_id))
    );
END;
$$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to chat-files
CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

-- Performance index for cursor-based message pagination
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at DESC);
