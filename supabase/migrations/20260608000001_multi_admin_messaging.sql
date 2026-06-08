-- Multi-Admin Support + Message Permissions
-- Adds: is_admin on participants, messages_policy on conversations
-- Replaces single created_by admin with multiple admins

-- 1. Add is_admin to conversation_participants
ALTER TABLE public.conversation_participants
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Add messages_policy to conversations
ALTER TABLE public.conversations
ADD COLUMN messages_policy TEXT NOT NULL DEFAULT 'all'
CHECK (messages_policy IN ('all', 'admins'));

-- 3. Backfill is_admin for existing group creators (groups with >2 participants)
UPDATE public.conversation_participants cp
SET is_admin = true
FROM public.conversations c
WHERE c.id = cp.conversation_id
  AND cp.user_id = c.created_by
  AND c.created_by IS NOT NULL
  AND (SELECT COUNT(*) FROM public.conversation_participants cp2 WHERE cp2.conversation_id = c.id) > 2;

-- 4. Drop old single-admin trigger
DROP TRIGGER IF EXISTS trg_auto_promote_admin ON public.conversation_participants;
DROP FUNCTION IF EXISTS public.auto_promote_admin_on_leave();

-- 5. New trigger: auto-promote a member to admin when the last admin leaves
CREATE OR REPLACE FUNCTION public.handle_admin_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_count INTEGER;
BEGIN
  IF OLD.is_admin THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.conversation_participants
    WHERE conversation_id = OLD.conversation_id AND is_admin = true;
    IF v_admin_count = 0 THEN
      UPDATE public.conversation_participants
      SET is_admin = true
      WHERE id = (
        SELECT id FROM public.conversation_participants
        WHERE conversation_id = OLD.conversation_id
        ORDER BY joined_at ASC LIMIT 1
      );
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_handle_admin_leave
  AFTER DELETE ON public.conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_leave();

-- 6. Trigger: block non-admin messages when policy is 'admins'
CREATE OR REPLACE FUNCTION public.check_message_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy TEXT;
BEGIN
  -- Allow system messages (type is set and non-empty)
  IF NEW.message_type IS NOT NULL AND NEW.message_type != '' THEN
    RETURN NEW;
  END IF;
  SELECT messages_policy INTO v_policy
  FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_policy = 'admins' AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id = auth.uid()
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can send messages in this group';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_message_permission
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_permission();

-- 7. Update conversations DELETE policy: any admin can delete
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid() AND is_admin = true
  )
);

-- 8. Update messages DELETE policy: any admin can delete any message
DROP POLICY IF EXISTS "Users can delete messages" ON public.messages;
CREATE POLICY "Users can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND is_admin = true
  )
);

-- 9. Update conversation_participants DELETE policy: any admin can kick
DROP POLICY IF EXISTS "Users can manage participants" ON public.conversation_participants;
CREATE POLICY "Users can manage participants"
ON public.conversation_participants
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
      AND cp2.is_admin = true
  )
);

-- 10. New UPDATE policy on conversation_participants: admins can promote/demote
CREATE POLICY "Admins can update participants"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
      AND cp2.is_admin = true
  )
)
WITH CHECK (true);
