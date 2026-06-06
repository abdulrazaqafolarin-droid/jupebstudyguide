-- Make admin RPCs also check by email as fallback
-- Fixes: super admin by email could see dashboard but generate_activation_codes
-- and get_admin_dashboard_stats RPCs only checked profiles.is_admin in DB.

-- 1. Update generate_activation_codes to accept admin email fallback
DROP FUNCTION IF EXISTS public.generate_activation_codes(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.generate_activation_codes(
  p_created_by UUID,
  p_count INTEGER DEFAULT 1,
  p_plan_type TEXT DEFAULT 'basic',
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE(code TEXT, plan_type TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_is_admin BOOLEAN;
  v_user_email TEXT;
  v_code TEXT;
  v_i INTEGER;
BEGIN
  -- Check admin status (DB flag OR email match)
  SELECT p.is_admin, au.email INTO v_user_is_admin, v_user_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = p_created_by;

  IF NOT v_user_is_admin AND (p_admin_email IS NULL OR v_user_email IS DISTINCT FROM p_admin_email) THEN
    RAISE EXCEPTION 'Only admins can generate activation codes';
  END IF;

  FOR v_i IN 1..p_count LOOP
    v_code := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)
    );

    INSERT INTO public.activation_codes (code, plan_type, created_by)
    VALUES (v_code, p_plan_type, p_created_by);

    code := v_code;
    plan_type := p_plan_type;
    expires_at := NULL;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 2. Update get_admin_dashboard_stats to accept admin email fallback
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(
  p_admin_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  caller_is_admin BOOLEAN;
  caller_email TEXT;
BEGIN
  -- Check caller is admin (DB flag OR email match)
  SELECT COALESCE(p.is_admin, false), au.email INTO caller_is_admin, caller_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = auth.uid();

  IF NOT caller_is_admin AND (p_admin_email IS NULL OR caller_email IS DISTINCT FROM p_admin_email) THEN
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
      COALESCE(plan_type, 'unknown') AS name,
      COUNT(*)::INT AS value
    FROM public.activation_codes
    GROUP BY plan_type
    ORDER BY plan_type
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
$$;

-- Grant execute on new signatures
REVOKE EXECUTE ON FUNCTION public.generate_activation_codes(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_activation_codes(UUID, INTEGER, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(TEXT) TO authenticated;
