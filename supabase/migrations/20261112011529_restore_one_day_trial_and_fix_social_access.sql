-- Restore the signup-only 24-hour trial while keeping profile entitlements server-controlled.
-- Paid activation may clear an existing trial, but no client may create or extend one.

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
      IF v_signup_trial IS DISTINCT FROM 'true'
         OR NEW.trial_started_at IS NULL
         OR NEW.trial_expires_at IS DISTINCT FROM (NEW.trial_started_at + interval '1 day') THEN
        RAISE EXCEPTION 'A trial can only be initialized by the one-day signup workflow'
          USING ERRCODE = '42501';
      END IF;
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

  -- Redeeming a paid code may only clear trial dates. It may not create or extend a trial.
  IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
     OR NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at THEN
    IF v_activation_rpc IS DISTINCT FROM 'true'
       OR NEW.trial_started_at IS NOT NULL
       OR NEW.trial_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'Trial access can only be initialized during signup or cleared by paid activation'
        USING ERRCODE = '42501';
    END IF;
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

-- New normal student signups receive exactly 24 hours. The StudyBot system
-- account remains exempt and existing accounts are not backfilled.
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

  -- Preserve the StudyBot welcome conversation for student signups.
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
      E'👋 Welcome to Rutex Master! Your account is ready. You have a 24-hour free trial. Enter an activation code any time to start or extend a paid subscription.',
      now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Include the one-day trial in the question bank's server-enforced access rule.
DROP POLICY IF EXISTS study_questions_select_policy ON public.study_questions;
CREATE POLICY study_questions_select_policy
ON public.study_questions
FOR SELECT
TO authenticated
USING (
  public.current_auth_session_is_active()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid())
      AND (
        p.is_admin IS TRUE
        OR (
          study_questions.hidden IS FALSE
          AND (
            p.trial_expires_at > statement_timestamp()
            OR p.subscription_expires_at > statement_timestamp()
          )
        )
      )
  )
);

-- The client only calls get_friends for its own user. Enforce that at the
-- SECURITY DEFINER boundary instead of trusting a caller-supplied UUID.
CREATE OR REPLACE FUNCTION public.get_friends(user_id uuid)
RETURNS TABLE(friend_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM get_friends.user_id THEN
    RAISE EXCEPTION 'You can only retrieve your own friends'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END,
    p.display_name,
    p.avatar_url
  FROM public.friend_requests fr
  JOIN public.profiles p
    ON p.user_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END
  WHERE (fr.sender_id = get_friends.user_id OR fr.receiver_id = get_friends.user_id)
    AND fr.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests b
      WHERE b.status = 'blocked'
        AND (
          (b.sender_id = get_friends.user_id AND b.receiver_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END)
          OR
          (b.sender_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END AND b.receiver_id = get_friends.user_id)
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_friends(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_friends(uuid) TO authenticated;

-- Report subscription terms, not the deprecated Basic/Premium/Lifetime labels.
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(p_admin_email text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  caller_is_admin BOOLEAN;
  caller_email TEXT;
  v_stored_admin_email TEXT;
BEGIN
  SELECT COALESCE(p.is_admin, false), au.email INTO caller_is_admin, caller_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = auth.uid();

  SELECT c.value INTO v_stored_admin_email
  FROM public.ai_api_keys_config c
  WHERE c.key = 'admin_email';

  IF NOT caller_is_admin
     AND (v_stored_admin_email IS NULL OR caller_email IS DISTINCT FROM v_stored_admin_email) THEN
    RAISE EXCEPTION 'Only admins can access dashboard stats';
  END IF;

  WITH profile_stats AS (
    SELECT
      COUNT(*)::INT AS total_users,
      COUNT(*) FILTER (WHERE is_activated = true)::INT AS activated_users
    FROM public.profiles
  ),
  code_stats AS (
    SELECT
      COUNT(*)::INT AS total_codes,
      COUNT(*) FILTER (WHERE is_used = true)::INT AS used_codes
    FROM public.activation_codes
  ),
  daily_signups AS (
    SELECT
      d::DATE AS date,
      COUNT(p.id)::INT AS count
    FROM generate_series(
      (CURRENT_DATE - INTERVAL '29 days')::DATE,
      CURRENT_DATE,
      '1 day'
    ) d
    LEFT JOIN public.profiles p ON p.created_at::DATE = d::DATE
    GROUP BY d::DATE
    ORDER BY d::DATE
  ),
  plan_dist AS (
    SELECT
      CASE
        WHEN duration_days IN (7, 30, 90) THEN duration_days::text || ' days'
        WHEN duration_days IS NULL THEN 'Legacy / no term'
        ELSE 'Other (' || duration_days::text || ' days)'
      END AS name,
      COUNT(*)::INT AS value
    FROM public.activation_codes
    GROUP BY
      CASE
        WHEN duration_days IN (7, 30, 90) THEN duration_days::text || ' days'
        WHEN duration_days IS NULL THEN 'Legacy / no term'
        ELSE 'Other (' || duration_days::text || ' days)'
      END
    ORDER BY name
  )
  SELECT jsonb_build_object(
    'total_users', (SELECT total_users FROM profile_stats),
    'activated_users', (SELECT activated_users FROM profile_stats),
    'total_codes', (SELECT total_codes FROM code_stats),
    'used_codes', (SELECT used_codes FROM code_stats),
    'recent_signups', (SELECT jsonb_agg(jsonb_build_object('date', date, 'count', count)) FROM daily_signups),
    'plan_distribution', (SELECT jsonb_agg(jsonb_build_object('name', name, 'value', value)) FROM plan_dist)
  ) INTO result;

  RETURN result;
END;
$function$;

NOTIFY pgrst, 'reload schema';
