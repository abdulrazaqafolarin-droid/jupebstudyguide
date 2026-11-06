-- Change new student trials from five days to 24 hours.
-- Existing unactivated trial accounts are shortened from their original start
-- time; already activated students are not affected.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conv_id UUID;
  v_trial_started_at TIMESTAMPTZ;
BEGIN
  IF lower(COALESCE(NEW.email, '')) = 'studybot@jupebstudyguide.app' THEN
    v_trial_started_at := NULL;
  ELSE
    v_trial_started_at := now();
  END IF;

  PERFORM set_config('app.signup_trial_initialize', 'true', true);
  INSERT INTO public.profiles (
    user_id,
    display_name,
    trial_started_at,
    trial_expires_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_trial_started_at,
    CASE
      WHEN v_trial_started_at IS NULL THEN NULL
      ELSE v_trial_started_at + interval '1 day'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  PERFORM set_config('app.signup_trial_initialize', 'false', true);

  IF NEW.email != 'studybot@jupebstudyguide.app' THEN
    v_conv_id := gen_random_uuid();
    INSERT INTO public.conversations (id, created_at, updated_at)
    VALUES (v_conv_id, now(), now());

    INSERT INTO public.conversation_participants (conversation_id, user_id, last_read_at)
    VALUES
      (v_conv_id, '00000000-0000-0000-0000-000000000000', now()),
      (v_conv_id, NEW.id, now());

    INSERT INTO public.messages (conversation_id, sender_id, content, created_at)
    VALUES (
      v_conv_id,
      '00000000-0000-0000-0000-000000000000',
      E'👋 Welcome to JUPEB Study Guide! I''m StudyBot, your AI study assistant.\n\nUse me to practice past questions, track your streaks, and ace your exams! Tap "AI Tutor" on any question to get personalized help. Good luck! 🎓',
      now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- This migration runs with database-owner privileges; set the transaction-local
-- service_role claim only for this controlled data correction so the existing
-- profile trigger continues rejecting ordinary client trial edits.
SELECT set_config('request.jwt.claim', '{"role":"service_role"}', true);

UPDATE public.profiles
SET trial_expires_at = trial_started_at + interval '1 day'
WHERE trial_started_at IS NOT NULL
  AND COALESCE(is_activated, false) = false
  AND (
    trial_expires_at IS NULL
    OR trial_expires_at > trial_started_at + interval '1 day'
  );

NOTIFY pgrst, 'reload schema';
