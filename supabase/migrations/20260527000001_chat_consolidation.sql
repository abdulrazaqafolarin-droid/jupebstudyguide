-- ============================================================
-- Migration: Chat Consolidation — single messaging system
-- Drops unused DM v2 tables, adds proper group_name to
-- conversations, creates missing chat-images bucket.
-- ============================================================

-- 1. Drop unused DM v2 tables (never wired to frontend)
--    These were created in 20260526000001_direct_messaging_v2.sql
--    but useChat.ts still uses conversations + messages only.
DROP TABLE IF EXISTS public.starred_messages CASCADE;
DROP TABLE IF EXISTS public.message_edits CASCADE;
DROP TABLE IF EXISTS public.message_status CASCADE;
DROP TABLE IF EXISTS public.direct_reactions CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;
DROP TABLE IF EXISTS public.direct_conversations CASCADE;

-- 2. Add group chat columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS group_name TEXT,
  ADD COLUMN IF NOT EXISTS group_avatar TEXT;

-- 3. Add updated_at trigger to conversations (DB handles it,
--    no more manual UPDATE in useChat.ts sendMessage)
CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversations_updated_at();

-- 4. Backfill group_name from existing messages that store it
--    (old system stored group name on first system message)
UPDATE public.conversations c
SET group_name = sub.group_name
FROM (
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id,
    m.group_name
  FROM public.messages m
  WHERE m.group_name IS NOT NULL
  ORDER BY m.conversation_id, m.created_at ASC
) sub
WHERE c.id = sub.conversation_id
  AND c.group_name IS NULL;

-- 5. Create chat-images storage bucket (referenced by useChat.ts
--    uploadImage but never created in any migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete own chat images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated');
