-- ============================================================
-- Migration: Cleanup stale rows and add useful indexes
-- Date: 2026-06-07
-- ============================================================

-- 1. Add GIN index for full-text message search
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
  ON public.messages USING gin(to_tsvector('english', content));

-- 2. Add index on friend_requests for faster lookups
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_receiver
  ON public.friend_requests(sender_id, receiver_id);

-- 3. Cleanup: remove stale user_presence rows older than 24 hours
--    (users who closed tab without cleanup)
DELETE FROM public.user_presence
WHERE updated_at < now() - interval '24 hours'
  AND is_online = false;

-- 4. Add cascade FK on user_presence when a user is deleted
ALTER TABLE public.user_presence
  DROP CONSTRAINT IF EXISTS user_presence_user_id_fkey,
  ADD CONSTRAINT user_presence_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 5. Add cascade FK on friend_requests when sender/receiver is deleted
ALTER TABLE public.friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_sender_id_fkey,
  ADD CONSTRAINT friend_requests_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES auth.users(id)
    ON DELETE CASCADE;

ALTER TABLE public.friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_receiver_id_fkey,
  ADD CONSTRAINT friend_requests_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES auth.users(id)
    ON DELETE CASCADE;
