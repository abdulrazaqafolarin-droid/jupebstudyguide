-- Push notification subscriptions table
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
