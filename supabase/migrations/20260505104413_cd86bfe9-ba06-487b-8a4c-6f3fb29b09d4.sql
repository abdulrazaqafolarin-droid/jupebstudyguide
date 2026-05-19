
-- Helper: bypasses RLS to avoid recursion when checking participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

-- conversation_participants: fix recursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can add participants to conversations they belong to" ON public.conversation_participants;
CREATE POLICY "Users can add participants to conversations they belong to"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_conversation_participant(conversation_id, auth.uid())
);

-- conversations: fix self-referential typo + use helper
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- messages: use helper (avoids future recursion risk)
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_participant(conversation_id, auth.uid())
);
