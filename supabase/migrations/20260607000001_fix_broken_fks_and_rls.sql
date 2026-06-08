-- ============================================================
-- Migration: Fix broken FK references and RLS leaks
-- Date: 2026-06-07
--
-- Fixes:
-- 1. notification_subscriptions.user_id → profiles(user_id) not profiles(id)
-- 2. user_presence.user_id → profiles(user_id) not profiles(id)
-- 3. Restrict "Service role can read all subscriptions" RLS policy
-- 4. Add sender_id index on messages for unread count queries
-- 5. Add updated_at index on conversations for list sorting
-- ============================================================

-- --------------------------------------------------
-- FIX 1: notification_subscriptions.user_id FK
-- --------------------------------------------------
ALTER TABLE public.notification_subscriptions
  DROP CONSTRAINT IF EXISTS notification_subscriptions_user_id_fkey,
  ADD CONSTRAINT notification_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- --------------------------------------------------
-- FIX 2: user_presence.user_id FK
-- --------------------------------------------------
ALTER TABLE public.user_presence
  DROP CONSTRAINT IF EXISTS user_presence_user_id_fkey,
  ADD CONSTRAINT user_presence_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- --------------------------------------------------
-- FIX 3: Fix RLS leak on notification_subscriptions
-- Remove the "any authenticated user can read all" policy.
-- Service role already bypasses RLS, so this is redundant.
-- --------------------------------------------------
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.notification_subscriptions;

-- --------------------------------------------------
-- FIX 4: Add missing performance indexes
-- --------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
  ON public.messages(sender_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated_at_desc
  ON public.conversations(updated_at DESC);

-- --------------------------------------------------
-- FIX 5: Drop duplicate index on messages
-- idx_messages_conversation and idx_messages_conversation_created
-- are identical. Keep one (the original).
-- --------------------------------------------------
DROP INDEX IF EXISTS idx_messages_conversation_created;
