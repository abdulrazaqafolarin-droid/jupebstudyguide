-- Rutex Master: single-device sessions and term-based subscriptions.
-- This migration is additive for subscription data and preserves account records.
-- Legacy activated accounts are intentionally not assigned invented durations:
-- the admin must grant the term actually purchased.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_duration_days integer;

ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS duration_days integer;

ALTER TABLE public.activation_codes
  ALTER COLUMN plan_type SET DEFAULT 'weekly';

DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.activation_codes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%plan_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.activation_codes DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END $$;

ALTER TABLE public.activation_codes
  ADD CONSTRAINT activation_codes_duration_days_check
  CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 3650);

COMMENT ON COLUMN public.profiles.subscription_expires_at IS
  'Server-managed end of the user subscription; null means no paid term is active.';
COMMENT ON COLUMN public.activation_codes.duration_days IS
  'Term granted when redeemed. Null denotes a legacy code that must be reissued or assigned a term by an administrator.';

-- Only the established owner account remains an admin. Do not infer admin
-- access from user-editable metadata or a client-provided email.
SELECT set_config('request.jwt.claim', '{"role":"service_role"}', true);
UPDATE public.profiles p
SET is_admin = (lower(u.email) = 'abdulrazaqafolarin@gmail.com')
FROM auth.users u
WHERE u.id = p.user_id
  AND p.is_admin IS DISTINCT FROM (lower(u.email) = 'abdulrazaqafolarin@gmail.com');

-- No student keeps a free trial under the new subscription model.
UPDATE public.profiles
SET trial_started_at = NULL,
    trial_expires_at = NULL
WHERE trial_started_at IS NOT NULL OR trial_expires_at IS NOT NULL;

-- Harden the profile security trigger so subscription entitlement cannot be
-- changed by a normal authenticated client. Trusted service-role operations
-- and activation-code redemption are the only permitted writers.
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
    IF COALESCE(NEW.is_admin, false) OR COALESCE(NEW.is_activated, false) THEN
      RAISE EXCEPTION 'Admin and activation privileges require trusted server operations'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.trial_started_at IS NOT NULL OR NEW.trial_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'Free trial access is disabled'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.subscription_started_at IS NOT NULL
       OR NEW.subscription_expires_at IS NOT NULL
       OR NEW.subscription_duration_days IS NOT NULL THEN
      RAISE EXCEPTION 'Subscriptions require trusted activation'
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
    RAISE EXCEPTION 'Free trial access is disabled'
      USING ERRCODE = '42501';
  END IF;

  IF (NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at
      OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
      OR NEW.subscription_duration_days IS DISTINCT FROM OLD.subscription_duration_days)
     AND v_activation_rpc IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Subscription changes require trusted activation'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_security_flags ON public.profiles;
CREATE TRIGGER guard_profile_security_flags
  BEFORE UPDATE OF is_admin, is_activated, trial_started_at, trial_expires_at,
    subscription_started_at, subscription_expires_at, subscription_duration_days
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_security_flags();

-- Attach the same guard to INSERT as well: the function's TG_OP = 'INSERT'
-- checks otherwise would never execute for a client-created profile row.
DROP TRIGGER IF EXISTS guard_profile_security_flags_insert ON public.profiles;
CREATE TRIGGER guard_profile_security_flags_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_security_flags();

-- Existing student activations do not carry a recorded subscription term.
-- The owner administrator is exempt. Revoke every currently active Supabase
-- session for previously activated students and clear their legacy activation
-- flag so they must sign in again and redeem a new duration-based code.
SELECT set_config('request.jwt.claim', '{"role":"service_role"}', true);

DELETE FROM auth.sessions AS s
USING public.profiles AS p
JOIN auth.users AS u ON u.id = p.user_id
WHERE s.user_id = p.user_id
  AND p.is_admin IS NOT TRUE
  AND p.is_activated IS TRUE
  AND lower(u.email) <> 'abdulrazaqafolarin@gmail.com';

UPDATE public.profiles AS p
SET is_activated = false
FROM auth.users AS u
WHERE u.id = p.user_id
  AND p.is_admin IS NOT TRUE
  AND p.is_activated IS TRUE
  AND lower(u.email) <> 'abdulrazaqafolarin@gmail.com';

-- Signups no longer receive an automatic free trial. Preserve the existing
-- welcome conversation behaviour for new student accounts.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conv_id UUID;
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    trial_started_at,
    trial_expires_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULL,
    NULL
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF lower(COALESCE(NEW.email, '')) <> 'studybot@jupebstudyguide.app' THEN
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
      E'👋 Welcome to Rutex Master! Your account is ready. Enter your activation code to unlock your purchased subscription.',
      now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Grant one active database session per non-admin account. Revoking refresh
-- sessions on sign-in is backed by this server-side check in question RLS,
-- making an old access token unusable for reading the question bank immediately.
CREATE OR REPLACE FUNCTION public.current_auth_session_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM auth.sessions AS s
      WHERE s.id = NULLIF(auth.jwt() ->> 'session_id', '')::uuid
        AND s.user_id = auth.uid()
    ),
    false
  );
$function$;

REVOKE ALL ON FUNCTION public.current_auth_session_is_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_auth_session_is_active() TO authenticated;

-- Rework question access around subscription expiry rather than the legacy
-- is_activated flag or free-trial dates.
DROP POLICY IF EXISTS study_questions_select_policy ON public.study_questions;
CREATE POLICY study_questions_select_policy
ON public.study_questions
FOR SELECT
TO authenticated
USING (
  public.current_auth_session_is_active()
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = (SELECT auth.uid())
      AND (
        p.is_admin IS TRUE
        OR (
          p.subscription_expires_at > statement_timestamp()
          AND public.study_questions.hidden IS FALSE
        )
      )
  )
);

DROP POLICY IF EXISTS study_question_embeddings_select_admin
  ON public.study_question_embeddings;
CREATE POLICY study_question_embeddings_select_admin
ON public.study_question_embeddings
FOR SELECT
TO authenticated
USING (
  public.current_auth_session_is_active()
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = (SELECT auth.uid())
      AND p.is_admin IS TRUE
  )
);

-- A revoked old device must no longer be able to fetch profile information
-- through the exposed Data API, even while its cached JWT has not expired.
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by active sessions"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.current_auth_session_is_active());

-- Create new duration-based activation codes. Old overloads are disabled so
-- legacy basic/premium/lifetime plan creation cannot bypass the new model.
CREATE OR REPLACE FUNCTION public.generate_activation_codes(
  p_created_by uuid,
  p_count integer DEFAULT 1,
  p_duration_days integer DEFAULT 7
)
RETURNS TABLE(code text, plan_type text, expires_at timestamptz, duration_days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_code text;
  v_i integer;
  v_type text;
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    -- The Edge Function has already authenticated the request and verified
    -- the owner email; still independently verify the referenced admin row.
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

    INSERT INTO public.activation_codes (code, plan_type, duration_days, created_by)
    VALUES (v_code, v_type, p_duration_days, v_actor);

    code := v_code;
    plan_type := v_type;
    expires_at := NULL;
    duration_days := p_duration_days;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_activation_codes(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_activation_codes(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_activation_codes(uuid, integer, integer) TO service_role;

-- Redeeming a code starts the term immediately, or extends an already active
-- term. A legacy code without an explicit duration fails closed.
CREATE OR REPLACE FUNCTION public.consume_activation_code(
  p_code text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.activation_codes%ROWTYPE;
  v_start timestamptz;
  v_expiry timestamptz;
BEGIN
  IF (auth.jwt() ->> 'role') <> 'service_role' THEN
    IF NOT public.current_auth_session_is_active() THEN
      RETURN jsonb_build_object('success', false, 'error', 'This device session is no longer active. Please sign in again.');
    END IF;
    p_user_id := auth.uid();
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = p_user_id
      AND lower(u.email) = 'abdulrazaqafolarin@gmail.com'
      AND p.is_admin IS TRUE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'The administrator account does not need an activation code');
  END IF;

  SELECT * INTO v_record
  FROM public.activation_codes
  WHERE code = upper(trim(p_code))
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE SKIP LOCKED;

  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired activation code');
  END IF;

  IF v_record.duration_days IS NULL OR v_record.duration_days NOT IN (7, 30, 90) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This is a legacy code without a subscription duration. Please request a new code from the administrator.');
  END IF;

  SELECT CASE
    WHEN p.subscription_expires_at > now() THEN p.subscription_expires_at
    ELSE now()
  END
  INTO v_start
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  FOR UPDATE;

  IF v_start IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account profile not found');
  END IF;

  v_expiry := v_start + make_interval(days => v_record.duration_days);

  UPDATE public.activation_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE id = v_record.id;

  PERFORM set_config('app.activation_code_consume', 'true', true);
  UPDATE public.profiles
  SET is_activated = true,
      subscription_started_at = CASE
        WHEN subscription_expires_at > now() THEN subscription_started_at
        ELSE now()
      END,
      subscription_expires_at = v_expiry,
      subscription_duration_days = v_record.duration_days,
      trial_started_at = NULL,
      trial_expires_at = NULL
  WHERE user_id = p_user_id;
  PERFORM set_config('app.activation_code_consume', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'plan_type', v_record.plan_type,
    'duration_days', v_record.duration_days,
    'subscription_expires_at', v_expiry,
    'code', v_record.code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_activation_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_activation_code(text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.current_auth_session_is_active() IS
  'Returns true only when the JWT session_id still exists in auth.sessions for auth.uid(). Used by RLS to reject revoked-device tokens before JWT expiry.';

NOTIFY pgrst, 'reload schema';
