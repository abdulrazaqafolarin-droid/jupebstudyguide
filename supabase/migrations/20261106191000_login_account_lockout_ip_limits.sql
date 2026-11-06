-- Atomic account lockout + per-IP throttling for the secure-login Edge Function.
CREATE TABLE IF NOT EXISTS public.login_security_counters (
  scope TEXT NOT NULL CHECK (scope IN ('account', 'ip')),
  subject_hash TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, subject_hash)
);
ALTER TABLE public.login_security_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_security_counters FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_login_allowed(p_account_hash TEXT, p_ip_hash TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account public.login_security_counters%ROWTYPE;
  v_ip public.login_security_counters%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  INSERT INTO public.login_security_counters(scope, subject_hash)
  VALUES ('account', p_account_hash), ('ip', p_ip_hash)
  ON CONFLICT (scope, subject_hash) DO NOTHING;
  SELECT * INTO v_account FROM public.login_security_counters
    WHERE scope='account' AND subject_hash=p_account_hash FOR UPDATE;
  SELECT * INTO v_ip FROM public.login_security_counters
    WHERE scope='ip' AND subject_hash=p_ip_hash FOR UPDATE;
  IF v_account.locked_until > v_now THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'account_locked', 'retry_after', CEIL(EXTRACT(EPOCH FROM (v_account.locked_until-v_now))));
  END IF;
  IF v_ip.locked_until > v_now THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ip_limited', 'retry_after', CEIL(EXTRACT(EPOCH FROM (v_ip.locked_until-v_now))));
  END IF;
  IF v_ip.window_started_at < v_now - interval '15 minutes' THEN
    UPDATE public.login_security_counters SET window_started_at=v_now, failed_attempts=0, locked_until=NULL, updated_at=v_now
      WHERE scope='ip' AND subject_hash=p_ip_hash;
  END IF;
  IF v_account.window_started_at < v_now - interval '15 minutes' THEN
    UPDATE public.login_security_counters SET window_started_at=v_now, failed_attempts=0, locked_until=NULL, updated_at=v_now
      WHERE scope='account' AND subject_hash=p_account_hash;
  END IF;
  RETURN jsonb_build_object('allowed', true);
END; $$;

CREATE OR REPLACE FUNCTION public.record_login_failure(p_account_hash TEXT, p_ip_hash TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now TIMESTAMPTZ := now(); v_account_count INTEGER; v_ip_count INTEGER;
BEGIN
  INSERT INTO public.login_security_counters(scope, subject_hash)
  VALUES ('account', p_account_hash), ('ip', p_ip_hash)
  ON CONFLICT (scope, subject_hash) DO NOTHING;
  UPDATE public.login_security_counters SET
    window_started_at=CASE WHEN window_started_at < v_now-interval '15 minutes' THEN v_now ELSE window_started_at END,
    failed_attempts=CASE WHEN window_started_at < v_now-interval '15 minutes' THEN 1 ELSE failed_attempts+1 END,
    locked_until=CASE WHEN (CASE WHEN window_started_at < v_now-interval '15 minutes' THEN 1 ELSE failed_attempts+1 END) >= 5 THEN v_now+interval '15 minutes' ELSE locked_until END,
    updated_at=v_now
    WHERE scope='account' AND subject_hash=p_account_hash;
  UPDATE public.login_security_counters SET
    window_started_at=CASE WHEN window_started_at < v_now-interval '15 minutes' THEN v_now ELSE window_started_at END,
    failed_attempts=CASE WHEN window_started_at < v_now-interval '15 minutes' THEN 1 ELSE failed_attempts+1 END,
    locked_until=CASE WHEN (CASE WHEN window_started_at < v_now-interval '15 minutes' THEN 1 ELSE failed_attempts+1 END) >= 30 THEN v_now+interval '15 minutes' ELSE locked_until END,
    updated_at=v_now
    WHERE scope='ip' AND subject_hash=p_ip_hash;
  SELECT failed_attempts INTO v_account_count FROM public.login_security_counters WHERE scope='account' AND subject_hash=p_account_hash;
  SELECT failed_attempts INTO v_ip_count FROM public.login_security_counters WHERE scope='ip' AND subject_hash=p_ip_hash;
  RETURN jsonb_build_object('account_attempts',v_account_count,'ip_attempts',v_ip_count);
END; $$;

CREATE OR REPLACE FUNCTION public.clear_login_failures(p_account_hash TEXT, p_ip_hash TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.login_security_counters
  WHERE (scope='account' AND subject_hash=p_account_hash)
     OR (scope='ip' AND subject_hash=p_ip_hash);
END; $$;

REVOKE ALL ON FUNCTION public.check_login_allowed(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_failure(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_login_failures(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_allowed(TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_failure(TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_login_failures(TEXT,TEXT) TO service_role;

-- Expire stale counter rows daily via normal request cleanup; no cron required.
