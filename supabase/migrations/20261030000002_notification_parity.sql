-- Notification parity: closed-app push must reach browser/PWA students too.
--
-- dispatch_push_notification() used to short-circuit unless a recipient had
-- an APK device token (device_tokens). Web students store a Web Push
-- subscription in notification_subscriptions instead, so they were skipped
-- entirely — and push-fcm only fanned out to FCM anyway. Net effect: APK
-- accounts got message pushes, browser accounts got none.
--
-- Part 1 (this migration): fire the dispatch when a recipient has EITHER a
-- device token OR a Web Push subscription.
-- Part 2 (supabase/functions/push-fcm): fan out to both wires.
--
-- Idempotent — the trigger, policies and http_post grant already exist from
-- 20261025000001; only the function body is replaced.

CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Group events ("name changed", "member left", ...) are inline system
  -- messages in the UI — popping them would be noise.
  IF NEW.message_type IN (
    'group_admin_promoted', 'group_created', 'group_member_left',
    'group_name_changed', 'group_photo_changed'
  ) THEN
    RETURN NEW;
  END IF;

  -- StudyBot's signup welcome: the new user has no device token yet.
  IF NEW.sender_id = '00000000-0000-0000-0000-000000000000' THEN
    RETURN NEW;
  END IF;

  -- Nobody reachable on this conversation -> no HTTP round trip. A recipient
  -- counts as reachable if they have an APK device token OR a browser Web
  -- Push subscription, so web-only students get closed-app pushes too.
  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id <> NEW.sender_id
      AND (
        EXISTS (
          SELECT 1 FROM public.device_tokens dt WHERE dt.user_id = cp.user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.notification_subscriptions ns
          WHERE ns.user_id = cp.user_id
        )
      )
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://gzyczowqqywesqhqqpdi.supabase.co/functions/v1/push-fcm',
    body := jsonb_build_object('message_id', NEW.id),
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 8000
  );
  RETURN NEW;
END;
$$;
