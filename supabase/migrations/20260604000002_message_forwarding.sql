-- ============================================================
-- Migration: Message Forwarding
-- ============================================================
-- Adds forwarded_from column to track forwarded messages.
-- Format: JSONB { message_id, sender_id, sender_name, conversation_id, forwarded_at }
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS forwarded_from JSONB;

-- Update message_type check to include 'forwarded'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'file', 'video', 'audio', 'forwarded'));
