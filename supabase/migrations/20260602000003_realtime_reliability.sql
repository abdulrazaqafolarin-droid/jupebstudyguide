-- Ensure messages table has REPLICA IDENTITY FULL for RLS-filtered realtime
-- Without this, postgres_changes events may not be delivered correctly
-- when RLS policies filter on foreign key relationships (is_conversation_participant)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Keep publication membership idempotent across fresh local and upgraded databases.
-- Earlier migrations or dashboard setup may already have added these tables.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END;
$$;
