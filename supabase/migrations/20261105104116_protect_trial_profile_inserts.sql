-- Prevent authenticated users from self-inserting trial dates in profiles.
-- The signup trigger sets a transaction-local marker before creating the profile;
-- direct client inserts do not have that marker and are rejected.

CREATE OR REPLACE FUNCTION public.guard_profile_security_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_activation_rpc text := current_setting('app.activation_code_consume', true);
  v_signup_trial text := current_setting('app.signup_trial_initialize', true);
BEGIN
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_admin, false) THEN
      RAISE EXCEPTION 'Admin privileges can only be changed by trusted server operations'
        USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.is_activated, false) THEN
      RAISE EXCEPTION 'Activation status can only be changed through the activation workflow'
        USING ERRCODE = '42501';
    END IF;

    IF (NEW.trial_started_at IS NOT NULL OR NEW.trial_expires_at IS NOT NULL)
       AND v_signup_trial IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Trial access can only be initialized by the signup workflow'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Admin privileges can only be changed by trusted server operations'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.is_activated IS DISTINCT FROM OLD.is_activated
     AND v_activation_rpc IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Activation status can only be changed through the activation workflow'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
     OR NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at THEN
    RAISE EXCEPTION 'Trial access can only be changed by trusted server operations'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Initialize the signup-only marker around the trusted profile insertion.
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
      ELSE v_trial_started_at + interval '5 days'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  PERFORM set_config('app.signup_trial_initialize', 'false', true);

  -- Preserve the StudyBot welcome conversation for student signups.
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

-- Keep UPDATE protection and add a separate INSERT guard.
DROP TRIGGER IF EXISTS guard_profile_security_flags_insert ON public.profiles;
CREATE TRIGGER guard_profile_security_flags_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_security_flags();

NOTIFY pgrst, 'reload schema';
