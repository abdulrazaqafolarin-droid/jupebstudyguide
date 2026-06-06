-- Fix Realtime RLS for messages table
-- 
-- Root cause: The INSERT policy's WITH CHECK included "sender_id = auth.uid()"
-- which evaluates to FALSE for the recipient (their auth.uid() != sender_id).
-- Supabase Realtime falls back to WITH CHECK when no USING clause exists on INSERT,
-- so the recipient never receives the broadcast event.
--
-- Fix: Move sender_id enforcement to a BEFORE INSERT trigger so the WITH CHECK
-- only checks conversation participation. This allows Realtime to broadcast
-- INSERT events to all participants.

CREATE OR REPLACE FUNCTION public.force_message_sender_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.sender_id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS force_sender_id_on_message ON public.messages;
CREATE TRIGGER force_sender_id_on_message
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.force_message_sender_id();

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));
