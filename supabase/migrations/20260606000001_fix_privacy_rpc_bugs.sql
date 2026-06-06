-- ============================================================
-- FIX: Privacy RPC column reference bugs + string mismatch
-- Date: 2026-06-06
--
-- Root cause 1: get_relationship_status returns 'friends' but
-- every consumer RPC checks for 'accepted'. All RPCs using this
-- function return wrong results for non-'everyone' privacy.
--
-- Root cause 2: Most privacy RPCs use WHERE id = p_target_user_id
-- but profiles.id is an auto-generated UUID (gen_random_uuid())
-- that NEVER matches profiles.user_id (= auth.users.id = auth.uid()).
-- The correct column is profiles.user_id.
--
-- Root cause 3: blocked_users and muted_conversations foreign keys
-- reference profiles(id) instead of profiles(user_id), causing
-- FK violations on every insert (auth.uid() != profiles.id).
-- ============================================================

-- --------------------------------------------------
-- FIX 1: Return 'accepted' from get_relationship_status
-- to match what all consumer RPCs expect
-- --------------------------------------------------
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
      WHEN fr.status = 'accepted' THEN 'accepted'
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

-- --------------------------------------------------
-- FIX 2: Fix can_view_profile to match new return value
-- Was checking for 'friends', now checks for 'accepted'
-- --------------------------------------------------
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

  IF target_privacy = 'everyone' THEN RETURN true; END IF;
  IF target_privacy = 'nobody' THEN RETURN false; END IF;

  SELECT get_relationship_status(auth.uid(), can_view_profile.target_user_id)
  INTO relationship;

  RETURN relationship = 'accepted';
END;
$$;

-- --------------------------------------------------
-- FIX 3: Fix can_view_last_seen — WHERE id -> WHERE user_id
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_last_seen(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_relationship TEXT;
BEGIN
  SELECT privacy_last_seen INTO v_privacy FROM public.profiles WHERE user_id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  SELECT get_relationship_status(p_target_user_id, auth.uid()) INTO v_relationship;
  RETURN v_relationship = 'accepted';
END;
$$;

-- --------------------------------------------------
-- FIX 4: Fix can_view_read_receipts (original version)
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_read_receipts(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_relationship TEXT;
BEGIN
  SELECT privacy_read_receipts INTO v_privacy FROM public.profiles WHERE user_id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  SELECT get_relationship_status(p_target_user_id, auth.uid()) INTO v_relationship;
  RETURN v_relationship = 'accepted';
END;
$$;

-- --------------------------------------------------
-- FIX 5: Fix get_last_seen (original version)
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_last_seen(p_target_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_last_seen TIMESTAMPTZ;
BEGIN
  SELECT privacy_last_seen, last_seen_at INTO v_privacy, v_last_seen
  FROM public.profiles WHERE user_id = p_target_user_id;

  IF v_privacy = 'everyone' THEN RETURN v_last_seen; END IF;
  IF v_privacy = 'nobody' THEN RETURN NULL; END IF;
  IF public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted' THEN
    RETURN v_last_seen;
  END IF;
  RETURN NULL;
END;
$$;

-- --------------------------------------------------
-- FIX 6: Fix can_view_profile_photo — WHERE id -> WHERE user_id
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_profile_photo(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
BEGIN
  SELECT privacy_avatar INTO v_privacy
  FROM public.profiles WHERE user_id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- FIX 7: Fix can_view_online_status — WHERE id -> WHERE user_id
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_online_status(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
BEGIN
  SELECT privacy_online_status INTO v_privacy
  FROM public.profiles WHERE user_id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- FIX 8: Fix can_add_to_group — WHERE id -> WHERE user_id
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_add_to_group(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
BEGIN
  SELECT privacy_groups INTO v_privacy
  FROM public.profiles WHERE user_id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- FIX 9: Fix get_last_seen (overwritten version with reciprocal rule)
-- All WHERE id -> WHERE user_id
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
  FROM public.profiles WHERE user_id = p_target_user_id;

  -- WhatsApp reciprocal rule: if caller hides last_seen from target, caller cannot see target's either
  SELECT privacy_last_seen INTO v_caller_privacy
  FROM public.profiles WHERE user_id = auth.uid();
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
-- FIX 10: Fix can_view_read_receipts (overwritten version with reciprocal)
-- All WHERE id -> WHERE user_id
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
  FROM public.profiles WHERE user_id = auth.uid();
  IF v_caller_privacy = 'nobody' THEN RETURN FALSE; END IF;

  SELECT privacy_read_receipts INTO v_privacy
  FROM public.profiles WHERE user_id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  RETURN public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted';
END;
$$;

-- --------------------------------------------------
-- FIX 11: Fix blocked_users FK — profiles(id) -> profiles(user_id)
-- --------------------------------------------------
ALTER TABLE public.blocked_users
  DROP CONSTRAINT IF EXISTS blocked_users_blocker_id_fkey,
  ADD CONSTRAINT blocked_users_blocker_id_fkey
    FOREIGN KEY (blocker_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.blocked_users
  DROP CONSTRAINT IF EXISTS blocked_users_blocked_id_fkey,
  ADD CONSTRAINT blocked_users_blocked_id_fkey
    FOREIGN KEY (blocked_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- --------------------------------------------------
-- FIX 12: Fix muted_conversations FK — profiles(id) -> profiles(user_id)
-- --------------------------------------------------
ALTER TABLE public.muted_conversations
  DROP CONSTRAINT IF EXISTS muted_conversations_user_id_fkey,
  ADD CONSTRAINT muted_conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
