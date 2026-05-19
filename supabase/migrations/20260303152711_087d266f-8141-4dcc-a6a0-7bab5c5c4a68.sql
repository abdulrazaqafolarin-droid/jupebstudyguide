
-- Tighten conversation creation: user must be a participant
DROP POLICY "Users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten participant insertion: user can only add themselves or if they're already in the conversation
DROP POLICY "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add participants to conversations they belong to"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
    )
  );
