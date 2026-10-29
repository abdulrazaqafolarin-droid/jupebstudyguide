-- Pre-launch hardening (2026-10-28)
--
-- 1. daily_missions: the table never existed in the database. The client's
--    restore + upsert sync have been failing (local-only history, error
--    toast). Create it with user-scoped RLS and the (user_id, local_date)
--    key the client upserts on.
-- 2. generate_activation_codes / get_admin_dashboard_stats: close a
--    self-approve bypass where any authenticated user could pass their OWN
--    email as p_admin_email and satisfy the "email match" admin branch.
--    Admin status now comes from profiles.is_admin or the STORED admin
--    email in ai_api_keys_config — never a caller argument.
-- 3. ai_api_keys_config: stop leaking the admin email to every
--    authenticated user (SELECT policy was role='authenticated').
-- 4. Scale indexes for hot RLS lookups that have been sequential-scanning.
-- 5. Drop leftover test table.

-- ── 1. daily_missions ──────────────────────────────────────────────────────

create table if not exists public.daily_missions (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  mission jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

alter table public.daily_missions enable row level security;

drop policy if exists "own daily missions select" on public.daily_missions;
create policy "own daily missions select" on public.daily_missions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "own daily missions insert" on public.daily_missions;
create policy "own daily missions insert" on public.daily_missions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own daily missions update" on public.daily_missions;
create policy "own daily missions update" on public.daily_missions
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own daily missions delete" on public.daily_missions;
create policy "own daily missions delete" on public.daily_missions
  for delete to authenticated using (auth.uid() = user_id);

-- ── 2. admin-bypass fixes ─────────────────────────────────────────────────

-- Drop the 4-arg overload whose p_admin_email branch let a caller
-- self-approve by passing their own profile email.
drop function if exists public.generate_activation_codes(uuid, integer, text, text);

create or replace function public.generate_activation_codes(
  p_created_by uuid default null,
  p_count integer default 1,
  p_plan_type text default 'basic'
)
returns table (code text, plan_type text, expires_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_is_admin boolean;
  v_user_email text;
  v_stored_admin_email text;
  v_code text;
  v_i integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(p.is_admin, false), au.email
    into v_user_is_admin, v_user_email
  from public.profiles p
  join auth.users au on au.id = p.user_id
  where p.user_id = auth.uid();

  select c.value into v_stored_admin_email
  from public.ai_api_keys_config c
  where c.key = 'admin_email';

  if not coalesce(v_user_is_admin, false)
     and (v_stored_admin_email is null or v_user_email is distinct from v_stored_admin_email) then
    raise exception 'Only admins can generate activation codes';
  end if;

  p_created_by := auth.uid();

  for v_i in 1..least(greatest(coalesce(p_count, 1), 1), 100) loop
    v_code := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)
    );

    insert into public.activation_codes (code, plan_type, created_by)
    values (v_code, p_plan_type, p_created_by);

    code := v_code;
    plan_type := p_plan_type;
    expires_at := null;
    return next;
  end loop;
end;
$function$;

revoke execute on function public.generate_activation_codes(uuid, integer, text) from public, anon;
grant execute on function public.generate_activation_codes(uuid, integer, text) to authenticated, service_role;

-- Same bypass shape: the caller-supplied p_admin_email was compared against
-- the CALLER's own email. Keep the signature (the dashboard passes it) but
-- ignore the argument; admins come from the flag or the stored config email.
create or replace function public.get_admin_dashboard_stats(p_admin_email text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

revoke execute on function public.get_admin_dashboard_stats(text) from public, anon;
grant execute on function public.get_admin_dashboard_stats(text) to authenticated, service_role;

revoke execute on function public.get_ai_usage_summary(text) from public, anon;
grant execute on function public.get_ai_usage_summary(text) to authenticated, service_role;

revoke execute on function public.admin_delete_question(text) from public, anon;
grant execute on function public.admin_delete_question(text) to authenticated, service_role;

-- ── 3. ai_api_keys_config: admin-only ─────────────────────────────────────
-- The old authenticated SELECT policy exposed the stored admin email to
-- every signed-in user, and the per-command policies referenced this table
-- inside their own quals (recursion hazard). One admin-scoped ALL policy.

drop policy if exists authenticated_select_config on public.ai_api_keys_config;
drop policy if exists admin_only_select_config on public.ai_api_keys_config;
drop policy if exists admin_only_insert_config on public.ai_api_keys_config;
drop policy if exists admin_only_update_config on public.ai_api_keys_config;
drop policy if exists admin_only_delete_config on public.ai_api_keys_config;

create policy ai_config_admin_all on public.ai_api_keys_config
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  ));

-- ── 4. scale indexes ──────────────────────────────────────────────────────

create index if not exists idx_study_sessions_user_id
  on public.study_sessions (user_id);

create index if not exists idx_activation_codes_used_by
  on public.activation_codes (used_by);

-- ── 5. cleanup ────────────────────────────────────────────────────────────

drop table if exists public.test_migration;
