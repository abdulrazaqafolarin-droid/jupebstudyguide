-- AI Key Vault Config: admin settings table
-- Migration: 20260624000001

-- ============================================================
-- TABLE: ai_api_keys_config — stores admin configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_api_keys_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_api_keys_config IS 'Configuration for AI Key Vault (admin email, thresholds, etc.)';

-- Seed default entries
INSERT INTO public.ai_api_keys_config (key, value) VALUES
  ('admin_email', ''),
  ('auto_failover_enabled', 'true'),
  ('quota_threshold_percent', '80')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- RLS: authenticated can read, only admin can write
-- ============================================================
ALTER TABLE public.ai_api_keys_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can SELECT config values
-- This is needed so RLS policies on ai_api_keys can reference this table
CREATE POLICY "authenticated_select_config"
  ON public.ai_api_keys_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admin can insert/update/delete
CREATE POLICY "admin_only_insert_config"
  ON public.ai_api_keys_config FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = (SELECT value FROM ai_api_keys_config WHERE key = 'admin_email'));

CREATE POLICY "admin_only_update_config"
  ON public.ai_api_keys_config FOR UPDATE
  USING (auth.jwt() ->> 'email' = (SELECT value FROM ai_api_keys_config WHERE key = 'admin_email'));

CREATE POLICY "admin_only_delete_config"
  ON public.ai_api_keys_config FOR DELETE
  USING (auth.jwt() ->> 'email' = (SELECT value FROM ai_api_keys_config WHERE key = 'admin_email'));

-- ============================================================
-- SECURITY DEFINER helper: reads config bypassing RLS
-- Used by ai_api_keys RLS policies to avoid policy recursion
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_config(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT value FROM ai_api_keys_config WHERE key = p_key;
$$;

-- ============================================================
-- UPDATE existing ai_api_keys RLS to use get_config()
-- ============================================================
DROP POLICY IF EXISTS "admin_only_select_ai_api_keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "admin_only_insert_ai_api_keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "admin_only_update_ai_api_keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "admin_only_delete_ai_api_keys" ON public.ai_api_keys;

CREATE POLICY "admin_only_select_ai_api_keys"
  ON public.ai_api_keys FOR SELECT
  USING (auth.jwt() ->> 'email' = public.get_config('admin_email'));

CREATE POLICY "admin_only_insert_ai_api_keys"
  ON public.ai_api_keys FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = public.get_config('admin_email'));

CREATE POLICY "admin_only_update_ai_api_keys"
  ON public.ai_api_keys FOR UPDATE
  USING (auth.jwt() ->> 'email' = public.get_config('admin_email'));

CREATE POLICY "admin_only_delete_ai_api_keys"
  ON public.ai_api_keys FOR DELETE
  USING (auth.jwt() ->> 'email' = public.get_config('admin_email'));

-- ============================================================
-- UPDATE existing ai_usage_log RLS to use get_config()
-- ============================================================
DROP POLICY IF EXISTS "admin_only_select_ai_usage_log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "admin_only_insert_ai_usage_log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "admin_only_update_ai_usage_log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "admin_only_delete_ai_usage_log" ON public.ai_usage_log;

CREATE POLICY "admin_only_select_ai_usage_log"
  ON public.ai_usage_log FOR SELECT
  USING (auth.jwt() ->> 'email' = public.get_config('admin_email'));

CREATE POLICY "admin_only_insert_ai_usage_log"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = public.get_config('admin_email'));

CREATE POLICY "admin_only_update_ai_usage_log"
  ON public.ai_usage_log FOR UPDATE
  USING (auth.jwt() ->> 'email' = public.get_config('admin_email'));

CREATE POLICY "admin_only_delete_ai_usage_log"
  ON public.ai_usage_log FOR DELETE
  USING (auth.jwt() ->> 'email' = public.get_config('admin_email'));
