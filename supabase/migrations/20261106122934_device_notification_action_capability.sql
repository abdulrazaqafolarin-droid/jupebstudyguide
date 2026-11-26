-- Keep existing installations on legacy OS-rendered FCM notifications.
-- Only new app builds explicitly opt in to inline notification actions.
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS supports_notification_actions BOOLEAN NOT NULL DEFAULT false;
