-- Replace delete_my_account() with comprehensive version covering ALL user tables
-- Ensures no orphaned data remains after account deletion

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid;
  conv_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Chat system
  -- Delete messages sent by user (FK cascade handles rest within conversation)
  DELETE FROM public.messages WHERE sender_id = uid;

  -- Remove user from conversation participants
  DELETE FROM public.conversation_participants WHERE user_id = uid;

  -- Clean up conversations that no longer have any participants
  FOR conv_id IN
    SELECT c.id FROM public.conversations c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = c.id
    )
  LOOP
    DELETE FROM public.conversations WHERE id = conv_id;
  END LOOP;

  -- AI chat system
  DELETE FROM public.ai_chat_messages WHERE user_id = uid;
  DELETE FROM public.ai_chats WHERE user_id = uid;

  -- Leaderboard & points
  DELETE FROM public.score_events WHERE user_id = uid;

  -- User stats
  DELETE FROM public.user_stats WHERE user_id = uid;

  -- Custom questions
  DELETE FROM public.custom_questions WHERE user_id = uid;

  -- Activation codes (release any code this user claimed)
  UPDATE public.activation_codes SET
    used_by = NULL,
    is_used = false,
    used_at = NULL
  WHERE used_by = uid;

  -- Profile (last public record referencing user)
  DELETE FROM public.profiles WHERE user_id = uid;

  -- Delete the auth user record (cascades to all auth-level data)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Re-apply permissions
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
