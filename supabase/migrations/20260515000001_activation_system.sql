-- ACTIVATION CODE SYSTEM
-- This migration adds:
-- 1. is_activated column to profiles
-- 2. activation_codes table with RLS
-- 3. Admin-level edge function support
-- 4. Master admin user tracking

-- Step 1: Add activation status to profiles
ALTER TABLE public.profiles
ADD COLUMN is_activated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_profiles_activated ON public.profiles(is_activated);

-- Add admin role support (must be before policies that reference is_admin)
ALTER TABLE public.profiles
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_profiles_admin ON public.profiles(is_admin);

-- Step 2: Create activation_codes table
CREATE TABLE public.activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'premium', 'lifetime')),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT valid_code_format CHECK (code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$')
);

CREATE INDEX idx_activation_codes_code ON public.activation_codes(code);
CREATE INDEX idx_activation_codes_used ON public.activation_codes(is_used);
CREATE INDEX idx_activation_codes_created_by ON public.activation_codes(created_by);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can view all codes
CREATE POLICY "Users can view their own used codes"
ON public.activation_codes FOR SELECT
TO authenticated
USING (
  used_by = auth.uid() 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Only admins can insert activation codes (enforced by edge function, RLS backup)
CREATE POLICY "Admins can insert activation codes"
ON public.activation_codes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Step 3: Function to validate and consume an activation code (called by edge function via service role)
CREATE OR REPLACE FUNCTION public.consume_activation_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.activation_codes;
  v_result JSONB;
BEGIN
  -- Check if user is already activated
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND is_activated = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already activated');
  END IF;

  -- Find and lock the code
  SELECT * INTO v_record
  FROM public.activation_codes
  WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE SKIP LOCKED;

  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired activation code');
  END IF;

  -- Mark code as used
  UPDATE public.activation_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE id = v_record.id;

  -- Activate the user
  UPDATE public.profiles
  SET is_activated = true
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_type', v_record.plan_type,
    'code', v_record.code
  );
END;
$$;

-- Step 4: Function to generate activation codes (admin only)
CREATE OR REPLACE FUNCTION public.generate_activation_codes(
  p_created_by UUID,
  p_count INTEGER DEFAULT 1,
  p_plan_type TEXT DEFAULT 'basic'
)
RETURNS TABLE(code TEXT, plan_type TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_is_admin BOOLEAN;
  v_code TEXT;
  v_i INTEGER;
BEGIN
  -- Check admin status
  SELECT is_admin INTO v_user_is_admin
  FROM public.profiles
  WHERE user_id = p_created_by;

  IF NOT v_user_is_admin THEN
    RAISE EXCEPTION 'Only admins can generate activation codes';
  END IF;

  FOR v_i IN 1..p_count LOOP
    -- Generate random code: XXXX-XXXX-XXXX
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

-- Grant execute permissions
REVOKE EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_activation_codes(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_activation_codes(UUID, INTEGER, TEXT) TO authenticated;
