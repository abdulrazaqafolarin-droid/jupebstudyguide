-- ADMIN DASHBOARD AGGREGATE RPC
-- Replaces client-side limit(5000) fetching with server-side aggregates
-- Security: only callable by admin users

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  caller_is_admin BOOLEAN;
BEGIN
  -- Check caller is admin
  SELECT COALESCE(p.is_admin, false) INTO caller_is_admin
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  IF NOT caller_is_admin THEN
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

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
