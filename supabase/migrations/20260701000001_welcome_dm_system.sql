-- Welcome DM System
-- Creates a StudyBot system user that sends a welcome DM to every new signup.

-- Step 1: Create the StudyBot system user (fixed UUID for deterministic lookups)
DO $$
DECLARE
  v_bot_id CONSTANT UUID := '00000000-0000-0000-0000-000000000000';
  v_exists  UUID;
BEGIN
  SELECT id INTO v_exists FROM auth.users WHERE id = v_bot_id;
  IF v_exists IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, aud, role
    ) VALUES (
      v_bot_id,
      '00000000-0000-0000-0000-000000000000',
      'studybot@jupebstudyguide.app',
      crypt('system-bot-' || gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), '', '', '', '',
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::text[]),
      jsonb_build_object(
        'display_name', 'StudyBot',
        'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=studybot'
      ),
      now(), now(), 'authenticated', 'authenticated'
    );
  END IF;
END $$;

-- Step 2: Set avatar_url on the bot's profile
UPDATE public.profiles
SET avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=studybot'
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND avatar_url IS NULL;

-- Step 3: Fix force_message_sender_id to not overwrite an already-set sender_id
CREATE OR REPLACE FUNCTION public.force_message_sender_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS NULL THEN
    NEW.sender_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Update handle_new_user to send a welcome DM
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

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
      E'\U0001f44b Welcome to JUPEB Study Guide! I''m StudyBot, your AI study assistant.\n\nUse me to practice past questions, track your streaks, and ace your exams! Tap "AI Tutor" on any question to get personalized help. Good luck! \U0001f393',
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;
