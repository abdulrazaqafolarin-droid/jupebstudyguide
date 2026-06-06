-- Ensure messages table has REPLICA IDENTITY FULL for RLS-filtered realtime
-- Without this, postgres_changes events may not be delivered correctly
-- when RLS policies filter on foreign key relationships (is_conversation_participant)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Re-ensure messages is in the realtime publication (idempotent)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Also add conversations and conversation_participants for real-time updates
-- on conversation list (new conversations, name changes)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
