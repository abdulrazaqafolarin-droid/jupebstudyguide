-- Preserve the existing JUPEB-only Production signup behavior while
-- allowing the new multi-programme client to start its trial after selection.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_conv_id uuid;
  v_trial_started_at timestamptz := pg_catalog.now();
  v_trial_expires_at timestamptz := v_trial_started_at + interval '1 day';
  v_multi_program_signup boolean :=
    COALESCE(NEW.raw_user_meta_data ->> 'exam_program_flow', '') = 'multi-programme-v1';
  v_internal_bot boolean :=
    lower(COALESCE(NEW.email, '')) = 'studybot@jupebstudyguide.app';
BEGIN
  IF v_multi_program_signup OR v_internal_bot THEN
    -- Current multi-programme clients defer trial creation until the student
    -- chooses JUPEB or JAMB. Internal studybot users never receive a trial.
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Compatibility for the still-live JUPEB-only Production client, which
    -- does not send exam_program_flow metadata and cannot show a programme
    -- chooser. Preserve its established one-day JUPEB signup trial.
    PERFORM pg_catalog.set_config('app.signup_trial_initialize', 'true', true);

    INSERT INTO public.profiles (
      user_id,
      display_name,
      selected_exam_program,
      trial_started_at,
      trial_expires_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
      'jupeb',
      v_trial_started_at,
      v_trial_expires_at
    )
    ON CONFLICT (user_id) DO NOTHING;

    PERFORM pg_catalog.set_config('app.signup_trial_initialize', 'false', true);

    -- Keep programme access and legacy profile access synchronized.
    INSERT INTO public.exam_program_entitlements (
      user_id, exam_program_id, trial_started_at, trial_expires_at
    )
    VALUES (
      NEW.id, 'jupeb', v_trial_started_at, v_trial_expires_at
    )
    ON CONFLICT (user_id, exam_program_id) DO NOTHING;
  END IF;

  IF lower(COALESCE(NEW.email, '')) <> 'studybot@jupebstudyguide.app' THEN
    v_conv_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.conversations (id, created_at, updated_at)
    VALUES (v_conv_id, pg_catalog.now(), pg_catalog.now());

    INSERT INTO public.conversation_participants (conversation_id, user_id, last_read_at)
    VALUES
      (v_conv_id, '00000000-0000-0000-0000-000000000000', pg_catalog.now()),
      (v_conv_id, NEW.id, pg_catalog.now());

    INSERT INTO public.messages (conversation_id, sender_id, content, created_at)
    VALUES (
      v_conv_id,
      '00000000-0000-0000-0000-000000000000',
      CASE
        WHEN v_multi_program_signup THEN
          E'Welcome to Rutex Master. Choose JUPEB or JAMB/UTME to open your study workspace. Your one-day trial starts in the programme you select.'
        ELSE
          E'Welcome to Rutex Master. Your JUPEB one-day trial has started. Open your study workspace to continue.'
      END,
      pg_catalog.now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profiles and welcome conversations. Legacy signups without the multi-programme marker receive the established one-day JUPEB trial; new multi-programme signups receive their trial after explicit programme selection.';
