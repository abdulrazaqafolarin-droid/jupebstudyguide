-- Advertise notification action support only after the upgraded app
-- has registered its native FCM token. Older installs remain on the safe
-- OS-rendered notification path until they upgrade.
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS supports_notification_actions BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.device_tokens.supports_notification_actions IS
  'True only when the registered Android client contains the inline reply/mark-read notification receiver.';
