-- CHAT SYSTEM FIXES
-- 1. Add view_once and expires_at columns to messages table
-- 2. Fix friend_requests CHECK constraint to allow 'blocked' status
-- 3. Add DELETE RLS policy for friend_requests
-- 4. Remove duplicate trigger on conversations

-- 1. Add missing columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS view_once BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Fix friend_requests CHECK constraint to include 'blocked'
ALTER TABLE public.friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_status_check;
ALTER TABLE public.friend_requests
  ADD CONSTRAINT friend_requests_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'));

-- 3. Add DELETE RLS policy on friend_requests
DROP POLICY IF EXISTS "Users can delete own friend_requests" ON public.friend_requests;
CREATE POLICY "Users can delete own friend_requests"
  ON public.friend_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 4. Drop duplicate trigger on conversations (old trigger from original migration)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
-- The trigger trg_conversations_updated_at (from chat_consolidation migration) remains
