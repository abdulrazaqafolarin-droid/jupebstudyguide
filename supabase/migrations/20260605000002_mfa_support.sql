-- ============================================================
-- Migration: MFA Support — 2FA via Supabase Auth TOTP
-- ============================================================

-- Track MFA enrollment state on profiles (actual secrets are
-- managed server-side by Supabase Auth's GoTrue)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enrolled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;
