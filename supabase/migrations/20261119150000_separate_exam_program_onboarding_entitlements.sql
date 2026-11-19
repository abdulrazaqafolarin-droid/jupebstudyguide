-- Separate study onboarding and paid/trial entitlements by examination programme.
-- Existing student entitlements and onboarding are preserved under JUPEB.
-- New accounts receive their one-day trial only after choosing a programme.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_exam_program text;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_selected_exam_program_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_selected_exam_program_check
      CHECK (
        selected_exam_program IS NULL
        OR selected_exam_program IN ('jupeb', 'jamb')
      );
  END IF;
END;
$;

ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS exam_program_id text NOT NULL DEFAULT 'jupeb';

ALTER TABLE public.activation_codes
  DROP CONSTRAINT IF EXISTS activation_codes_exam_program_id_check;
ALTER TABLE public.activation_codes
  ADD CONSTRAINT activation_codes_exam_program_id_check
  CHECK (exam_program_id IN ('jupeb', 'jamb'));

CREATE TABLE IF NOT EXISTS public.exam_program_entitlements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_program_id text NOT NULL CHECK (exam_program_id IN ('jupeb', 'jamb')),
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  subscription_started_at timestamptz,
  subscription_expires_at timestamptz,
  subscription_duration_days integer,
  activation_code_id uuid UNIQUE REFERENCES public.activation_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_program_id),
  CHECK (
    trial_expires_at IS NULL
    OR trial_started_at IS NOT NULL
  ),
  CHECK (
    subscription_expires_at IS NULL
    OR subscription_started_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS exam_program_entitlements_program_expiry_idx
  ON public.exam_program_entitlements (exam_program_id, subscription_expires_at);

CREATE TABLE IF NOT EXISTS public.exam_program_onboarding (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_program_id text NOT NULL CHECK (exam_program_id IN ('jupeb', 'jamb')),
  completed_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_program_id)
);

-- Keep every existing learner's current profile-level paid access in JUPEB.
INSERT INTO public.exam_program_entitlements (
  user_id, exam_program_id, trial_started_at, trial_expires_at,
  subscription_started_at, subscription_expires_at, subscription_duration_days,
  created_at, updated_at
)
SELECT
  p.user_id,
  'jupeb',
  CASE
    WHEN p.trial_expires_at IS NOT NULL
      THEN COALESCE(p.trial_started_at, p.created_at, now())
    ELSE p.trial_started_at
  END,
  p.trial_expires_at,
  CASE
    WHEN p.subscription_expires_at IS NOT NULL
      THEN COALESCE(p.subscription_started_at, p.created_at, now())
    ELSE p.subscription_started_at
  END,
  p.subscription_expires_at,
  p.subscription_duration_days,
  COALESCE(p.created_at, now()), COALESCE(p.updated_at, now())
FROM public.profiles p
WHERE p.trial_started_at IS NOT NULL
   OR p.trial_expires_at IS NOT NULL
   OR p.subscription_started_at IS NOT NULL
   OR p.subscription_expires_at IS NOT NULL
ON CONFLICT (user_id, exam_program_id) DO NOTHING;

-- Accounts that existed before this migration keep the familiar JUPEB landing
-- page. New profiles created after deployment remain NULL until programme choice.
UPDATE public.profiles
SET selected_exam_program = 'jupeb'
WHERE selected_exam_program IS NULL;

-- Preserve existing onboarding under JUPEB, while JAMB receives an independent
-- record and cannot inherit JUPEB's completed-step flag.
INSERT INTO public.exam_program_onboarding (
  user_id, exam_program_id, completed_at, data, created_at, updated_at
)
SELECT
  p.user_id, 'jupeb', p.onboarding_completed_at,
  COALESCE(p.onboarding_data, '{}'::jsonb),
  COALESCE(p.created_at, now()), COALESCE(p.updated_at, now())
FROM public.profiles p
WHERE p.onboarding_completed_at IS NOT NULL
   OR COALESCE(p.onboarding_data, '{}'::jsonb) <> '{}'::jsonb
ON CONFLICT (user_id, exam_program_id) DO NOTHING;

ALTER TABLE public.exam_program_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_program_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_program_entitlements_read_own ON public.exam_program_entitlements;
CREATE POLICY exam_program_entitlements_read_own
  ON public.exam_program_entitlements
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT public.current_auth_session_is_active())
  );

DROP POLICY IF EXISTS exam_program_onboarding_read_own ON public.exam_program_onboarding;
CREATE POLICY exam_program_onboarding_read_own
  ON public.exam_program_onboarding
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT public.current_auth_session_is_active())
  );

DROP POLICY IF EXISTS exam_program_onboarding_insert_own ON public.exam_program_onboarding;
CREATE POLICY exam_program_onboarding_insert_own
  ON public.exam_program_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT public.current_auth_session_is_active())
  );

DROP POLICY IF EXISTS exam_program_onboarding_update_own ON public.exam_program_onboarding;
CREATE POLICY exam_program_onboarding_update_own
  ON public.exam_program_onboarding
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT public.current_auth_session_is_active())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT public.current_auth_session_is_active())
  );

DROP POLICY IF EXISTS exam_program_onboarding_delete_own ON public.exam_program_onboarding;
CREATE POLICY exam_program_onboarding_delete_own
  ON public.exam_program_onboarding
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT public.current_auth_session_is_active())
  );

REVOKE ALL ON TABLE public.exam_program_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.exam_program_entitlements TO authenticated;
GRANT ALL ON TABLE public.exam_program_entitlements TO service_role;

REVOKE ALL ON TABLE public.exam_program_onboarding FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_program_onboarding TO authenticated;
GRANT ALL ON TABLE public.exam_program_onboarding TO service_role;

COMMENT ON TABLE public.exam_program_entitlements IS
  'Independent trial and paid subscription state for each examination programme. Access is programme-scoped.';
COMMENT ON TABLE public.exam_program_onboarding IS
  'Independent onboarding completion and preferences for each examination programme.';
COMMENT ON COLUMN public.profiles.selected_exam_program IS
  'Preferred workspace only; it does not grant access to that programme.';

-- Protect the preferred programme from client-side profile edits. The RPC below
-- is the only authenticated path that can change it.
CREATE OR REPLACE FUNCTION public.guard_selected_exam_program_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.selected_exam_program IS DISTINCT FROM OLD.selected_exam_program
     AND current_setting('app.select_exam_program', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Use the programme selection workflow to change your workspace'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_selected_exam_program_change ON public.profiles;
CREATE TRIGGER guard_selected_exam_program_change
  BEFORE UPDATE OF selected_exam_program ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_selected_exam_program_change();

CREATE OR REPLACE FUNCTION public.select_exam_program(p_exam_program_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_previous_program text;
  v_is_admin boolean;
  v_trial_expires_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_exam_program_id IS NULL OR p_exam_program_id NOT IN ('jupeb', 'jamb') THEN
    RAISE EXCEPTION 'Choose JUPEB or JAMB' USING ERRCODE = '22023';
  END IF;
  IF NOT public.current_auth_session_is_active() THEN
    RAISE EXCEPTION 'This device session is no longer active. Please sign in again.'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.selected_exam_program, p.is_admin
  INTO v_previous_program, v_is_admin
  FROM public.profiles p
  WHERE p.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account profile not found';
  END IF;

  -- Only the first programme choice earns the signup trial. Changing workspace
  -- later never manufactures a second free trial.
  IF v_previous_program IS NULL AND NOT COALESCE(v_is_admin, false) THEN
    INSERT INTO public.exam_program_entitlements (
      user_id, exam_program_id, trial_started_at, trial_expires_at
    )
    VALUES (v_user_id, p_exam_program_id, now(), now() + interval '1 day')
    ON CONFLICT (user_id, exam_program_id) DO NOTHING;

    SELECT e.trial_expires_at
    INTO v_trial_expires_at
    FROM public.exam_program_entitlements e
    WHERE e.user_id = v_user_id
      AND e.exam_program_id = p_exam_program_id;
  END IF;

  PERFORM set_config('app.select_exam_program', 'true', true);
  UPDATE public.profiles
  SET selected_exam_program = p_exam_program_id
  WHERE user_id = v_user_id;
  PERFORM set_config('app.select_exam_program', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'exam_program_id', p_exam_program_id,
    'trial_expires_at', v_trial_expires_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.select_exam_program(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_exam_program(text) TO authenticated;

-- Generate codes for exactly one product. Old codes are retained as JUPEB via
-- the new column's default, while newly generated codes carry an explicit side.
DROP FUNCTION IF EXISTS public.generate_activation_codes(uuid, integer, text);
DROP FUNCTION IF EXISTS public.generate_activation_codes(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.generate_activation_codes(
  p_created_by uuid,
  p_count integer DEFAULT 1,
  p_duration_days integer DEFAULT 7,
  p_exam_program_id text DEFAULT 'jupeb'
)
RETURNS TABLE(code text, plan_type text, expires_at timestamptz, duration_days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
DECLARE
  v_actor uuid;
  v_code text;
  v_i integer;
  v_type text;
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    v_actor := p_created_by;
  ELSE
    v_actor := auth.uid();
  END IF;

  IF v_actor IS NULL OR v_actor <> p_created_by
     OR NOT EXISTS (
       SELECT 1
       FROM auth.users u
       JOIN public.profiles p ON p.user_id = u.id
       WHERE u.id = v_actor
         AND lower(u.email) = 'abdulrazaqafolarin@gmail.com'
         AND p.is_admin IS TRUE
     ) THEN
    RAISE EXCEPTION 'Only the established admin can generate activation codes';
  END IF;

  IF p_exam_program_id IS NULL OR p_exam_program_id NOT IN ('jupeb', 'jamb') THEN
    RAISE EXCEPTION 'Choose JUPEB or JAMB for this activation code';
  END IF;
  IF p_duration_days NOT IN (7, 30, 90) THEN
    RAISE EXCEPTION 'Choose a 7-day, 30-day, or 90-day subscription';
  END IF;

  v_type := CASE p_duration_days
    WHEN 7 THEN 'weekly'
    WHEN 30 THEN 'monthly'
    ELSE 'quarterly'
  END;

  FOR v_i IN 1..LEAST(GREATEST(COALESCE(p_count, 1), 1), 100) LOOP
    v_code := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)
    );

    INSERT INTO public.activation_codes (
      code, plan_type, duration_days, created_by, exam_program_id
    )
    VALUES (v_code, v_type, p_duration_days, v_actor, p_exam_program_id);

    code := v_code;
    plan_type := v_type;
    expires_at := NULL;
    duration_days := p_duration_days;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_activation_codes(uuid, integer, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_activation_codes(uuid, integer, integer, text)
  TO service_role;

DROP FUNCTION IF EXISTS public.consume_activation_code(text, uuid);

CREATE OR REPLACE FUNCTION public.consume_activation_code(
  p_code text,
  p_user_id uuid,
  p_exam_program_id text DEFAULT 'jupeb'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
DECLARE
  v_record public.activation_codes%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_current_expiry timestamptz;
  v_start timestamptz;
  v_expiry timestamptz;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    IF NOT public.current_auth_session_is_active() THEN
      RETURN jsonb_build_object('success', false, 'error', 'This device session is no longer active. Please sign in again.');
    END IF;
    p_user_id := auth.uid();
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_exam_program_id IS NULL OR p_exam_program_id NOT IN ('jupeb', 'jamb') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported examination programme');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account profile not found');
  END IF;

  IF lower(COALESCE((SELECT u.email FROM auth.users u WHERE u.id = p_user_id), '')) = 'abdulrazaqafolarin@gmail.com'
     AND v_profile.is_admin IS TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'The administrator account does not need an activation code');
  END IF;

  -- A code minted for one programme is invisible to the other programme.
  SELECT * INTO v_record
  FROM public.activation_codes c
  WHERE c.code = upper(trim(p_code))
    AND c.exam_program_id = p_exam_program_id
    AND c.is_used = false
    AND (c.expires_at IS NULL OR c.expires_at > now())
  FOR UPDATE SKIP LOCKED;

  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired activation code for this programme');
  END IF;

  IF v_record.duration_days IS NULL OR v_record.duration_days NOT IN (7, 30, 90) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This is a legacy code without a subscription duration. Please request a new code from the administrator.');
  END IF;

  SELECT e.subscription_expires_at
  INTO v_current_expiry
  FROM public.exam_program_entitlements e
  WHERE e.user_id = p_user_id
    AND e.exam_program_id = p_exam_program_id
  FOR UPDATE;

  v_start := CASE
    WHEN v_current_expiry > now() THEN v_current_expiry
    ELSE now()
  END;
  v_expiry := v_start + make_interval(days => v_record.duration_days);

  UPDATE public.activation_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE id = v_record.id;

  INSERT INTO public.exam_program_entitlements (
    user_id, exam_program_id, trial_started_at, trial_expires_at,
    subscription_started_at, subscription_expires_at,
    subscription_duration_days, activation_code_id, updated_at
  )
  VALUES (
    p_user_id, p_exam_program_id, NULL, NULL,
    v_start, v_expiry, v_record.duration_days, v_record.id, now()
  )
  ON CONFLICT (user_id, exam_program_id) DO UPDATE
  SET trial_started_at = NULL,
      trial_expires_at = NULL,
      subscription_started_at = CASE
        WHEN public.exam_program_entitlements.subscription_expires_at > now()
          THEN public.exam_program_entitlements.subscription_started_at
        ELSE now()
      END,
      subscription_expires_at = v_expiry,
      subscription_duration_days = EXCLUDED.subscription_duration_days,
      activation_code_id = EXCLUDED.activation_code_id,
      updated_at = now();

  -- Retain the legacy flag for compatibility with account/admin screens only.
  -- Programme access is decided exclusively by exam_program_entitlements.
  PERFORM set_config('app.activation_code_consume', 'true', true);
  UPDATE public.profiles SET is_activated = true WHERE user_id = p_user_id;
  PERFORM set_config('app.activation_code_consume', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'exam_program_id', p_exam_program_id,
    'plan_type', v_record.plan_type,
    'duration_days', v_record.duration_days,
    'subscription_expires_at', v_expiry,
    'code', v_record.code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_activation_code(text, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_activation_code(text, uuid, text)
  TO authenticated, service_role;

-- No signup-wide entitlement: start the one-day trial transactionally when a
-- newly-created account makes its first programme choice.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_conv_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

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
      E'Welcome to Rutex Master. Choose JUPEB or JAMB/UTME to open your study workspace. Your one-day trial starts in the programme you select.',
      pg_catalog.now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Enforce programme-specific access in the database, not only in React.
DROP POLICY IF EXISTS study_questions_select_policy ON public.study_questions;
CREATE POLICY study_questions_select_policy
  ON public.study_questions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_auth_session_is_active())
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND (
          p.is_admin IS TRUE
          OR (
            public.study_questions.hidden IS FALSE
            AND public.study_questions.review_status = 'published'
            AND EXISTS (
              SELECT 1
              FROM public.exam_program_entitlements e
              WHERE e.user_id = p.user_id
                AND e.exam_program_id = COALESCE(public.study_questions.exam_program_id, 'jupeb')
                AND (
                  e.trial_expires_at > statement_timestamp()
                  OR e.subscription_expires_at > statement_timestamp()
                )
            )
          )
        )
    )
  );

COMMENT ON POLICY study_questions_select_policy ON public.study_questions IS
  'Requires an active device session and an unexpired entitlement for the same exam programme, or an administrator role.';

NOTIFY pgrst, 'reload schema';
COMMIT;
