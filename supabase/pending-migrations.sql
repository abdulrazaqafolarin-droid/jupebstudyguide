-- ============================================================
-- PENDING MIGRATIONS — not yet applied to the live database
-- (live project: gzyczowqqywesqhqqpdi)
--
-- These statements exist in supabase/migrations/ but were never
-- applied to the live project, so application code that depends
-- on them currently fails at runtime AND at typecheck time.
--
-- HOW TO APPLY (one time):
--   1. Open the Supabase dashboard > SQL Editor > New query
--   2. Paste this entire file and run it
--   3. Re-generate the client types (they currently contain these
--      objects marked PENDING — remove the PENDING markers after):
--        curl -s -H "Authorization: Bearer $SB_ACCESS_TOKEN" \
--          "https://api.supabase.com/v1/projects/gzyczowqqywesqhqqpdi/types/typescript" \
--          | python -c "import json,sys; print(json.load(sys.stdin)['types'])" \
--          > src/integrations/supabase/types.ts
--
-- Every statement below is idempotent — safe to run even if some
-- parts were already applied.
-- ============================================================

-- 1) Idempotency key for chat message inserts
--    Source: supabase/migrations/20260607000002_add_client_msg_id.sql
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_msg_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_messages_client_msg_id
  ON public.messages(client_msg_id);

-- 2) MFA enrollment tracking on profiles
--    Source: supabase/migrations/20260605000002_mfa_support.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enrolled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;

-- 3) Push notification subscriptions
--    Source: supabase/migrations/20260531000004_push_notifications.sql
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id
  ON public.notification_subscriptions(user_id);

ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Users can manage their own subscriptions"
  ON public.notification_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.notification_subscriptions;
CREATE POLICY "Service role can read all subscriptions"
  ON public.notification_subscriptions
  FOR SELECT
  USING (true);

-- 4) Syllabus progress cross-device sync
--    Source: supabase/migrations/20260603000001_syllabus_progress_sync.sql
CREATE TABLE IF NOT EXISTS public.syllabus_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.syllabus_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own syllabus progress" ON public.syllabus_progress;
CREATE POLICY "Users can read own syllabus progress"
  ON public.syllabus_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own syllabus progress" ON public.syllabus_progress;
CREATE POLICY "Users can insert own syllabus progress"
  ON public.syllabus_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own syllabus progress" ON public.syllabus_progress;
CREATE POLICY "Users can update own syllabus progress"
  ON public.syllabus_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own syllabus progress" ON public.syllabus_progress;
CREATE POLICY "Users can delete own syllabus progress"
  ON public.syllabus_progress
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_syllabus_progress_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_syllabus_progress_updated ON public.syllabus_progress;
CREATE TRIGGER on_syllabus_progress_updated
  BEFORE UPDATE ON public.syllabus_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_syllabus_progress_updated_at();

-- 5) AI Key Vault: multi-provider keys + resilient failover
--    The vault previously only served Gemini; Groq/NVIDIA keys stacked in
--    the UI were never used, and one quota error permanently killed the
--    only key (token_exhausted) with no auto-recovery — causing the
--    "All AI providers unavailable for streaming" outage.
ALTER TABLE public.ai_api_keys
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_api_keys_provider_check') THEN
    ALTER TABLE public.ai_api_keys
      ADD CONSTRAINT ai_api_keys_provider_check
      CHECK (provider IN ('gemini', 'groq', 'nvidia'));
  END IF;
END $$;

-- Priorities only need to be unique within a provider (keys are stacked
-- per provider). The old global unique index blocked stacking keys.
DROP INDEX IF EXISTS idx_ai_api_keys_priority;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_api_keys_provider_priority
  ON public.ai_api_keys (provider, priority);
