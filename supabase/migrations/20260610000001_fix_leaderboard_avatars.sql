-- Fix leaderboard/profile avatars not showing
-- Two issues:
--   1. can_view_profile_photo had WHERE id instead of WHERE user_id
--   2. Some profiles may have privacy_avatar set to non-default values

-- Fix the RPC (ensure it uses WHERE user_id, not WHERE id)
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

-- Ensure ALL profiles with avatar_url have privacy_avatar = 'everyone'
-- so leaderboard photos show for everyone
UPDATE public.profiles
SET privacy_avatar = 'everyone'
WHERE avatar_url IS NOT NULL AND avatar_url != ''
  AND (privacy_avatar IS NULL OR privacy_avatar != 'everyone');
