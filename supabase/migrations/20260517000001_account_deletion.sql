-- Create a secure RPC function for self-serve account deletion
-- Deletes all user data from public tables and the auth.users record
-- Uses SECURITY DEFINER so the function runs with owner privileges

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user data from public tables
  DELETE FROM public.ai_chat_messages WHERE user_id = uid;
  DELETE FROM public.ai_chats WHERE user_id = uid;
  DELETE FROM public.score_events WHERE user_id = uid;
  DELETE FROM public.conversation_state WHERE user_id = uid;
  DELETE FROM public.conversation_summaries WHERE user_id = uid;
  DELETE FROM public.conversion_events WHERE user_id = uid;
  DELETE FROM public.appointments WHERE user_id = uid;
  
  -- Delete the activation code record if any
  UPDATE public.activation_codes SET used_by = NULL WHERE used_by = uid;
  
  -- Delete profile last (foreign key dependency)
  DELETE FROM public.profiles WHERE user_id = uid;

  -- Delete the auth user record (must happen after public data is cleaned)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Revoke execute from public, only allow authenticated users
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
