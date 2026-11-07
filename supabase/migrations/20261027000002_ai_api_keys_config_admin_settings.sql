-- Restore the small admin settings table used by the dashboard and
-- prelaunch hardening migration. Values are intentionally not seeded here:
-- production API credentials and admin settings must never be copied to CI.
CREATE TABLE IF NOT EXISTS public.ai_api_keys_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_api_keys_config_key_key
  ON public.ai_api_keys_config (key);

ALTER TABLE public.ai_api_keys_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_config_admin_all ON public.ai_api_keys_config;
CREATE POLICY ai_config_admin_all
ON public.ai_api_keys_config
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = auth.uid()
      AND p.is_admin IS TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = auth.uid()
      AND p.is_admin IS TRUE
  )
);

REVOKE ALL ON TABLE public.ai_api_keys_config FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_api_keys_config TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.ai_api_keys_config TO service_role;
