-- ============================================================
-- Migration: Add client_msg_id for idempotent message inserts
-- Date: 2026-06-07
--
-- Allows safe retry of message inserts: if a message with the
-- same client_msg_id already exists, the insert is ignored.
-- Prevents duplicate messages when network drops after insert
-- but before client receives confirmation.
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_msg_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_messages_client_msg_id
  ON public.messages(client_msg_id);
