-- ============================================================
-- Migration: per-user AI rate limits + activation gate support
-- Date: 2026-10-11
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role only ai_rate_limits" ON public.ai_rate_limits;
CREATE POLICY "service_role only ai_rate_limits"
  ON public.ai_rate_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Atomic check-and-increment. Returns true if under the daily limit.
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_rate_limits (user_id, window_date, request_count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    request_count = CASE
      WHEN ai_rate_limits.window_date < CURRENT_DATE THEN 1
      ELSE ai_rate_limits.request_count + 1
    END,
    window_date = CURRENT_DATE,
    updated_at = now()
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(UUID, INTEGER) TO service_role;
