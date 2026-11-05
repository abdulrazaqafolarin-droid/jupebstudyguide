-- Protect privileged profile flags from direct authenticated profile updates.
-- The profile self-update policy intentionally permits ordinary profile fields,
-- so a trigger must protect columns that must only be changed by trusted flows.

CREATE OR REPLACE FUNCTION public.guard_profile_security_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_activation_rpc text := current_setting('app.activation_code_consume', true);
BEGIN
  IF v_role = 'service_role' THEN
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_security_flags ON public.profiles;
CREATE TRIGGER guard_profile_security_flags
  BEFORE UPDATE OF is_admin, is_activated ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_security_flags();

-- Mark the trusted activation path for the duration of this transaction only.
CREATE OR REPLACE FUNCTION public.consume_activation_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record public.activation_codes;
BEGIN
  IF (auth.jwt() ->> 'role') != 'service_role' THEN
    p_user_id := auth.uid();
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_user_id AND is_activated = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already activated');
  END IF;

  SELECT * INTO v_record
  FROM public.activation_codes
  WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE SKIP LOCKED;

  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired activation code');
  END IF;

  UPDATE public.activation_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE id = v_record.id;

  PERFORM set_config('app.activation_code_consume', 'true', true);
  UPDATE public.profiles
  SET is_activated = true
  WHERE user_id = p_user_id;
  PERFORM set_config('app.activation_code_consume', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'plan_type', v_record.plan_type,
    'code', v_record.code
  );
END;
$function$;

COMMENT ON FUNCTION public.guard_profile_security_flags() IS
  'Prevents authenticated users from self-granting admin or activation status; trusted server/activation RPC only.';
