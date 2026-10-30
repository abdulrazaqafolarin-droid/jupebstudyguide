-- Student onboarding: completion timestamp, per-step data, theme preference.
-- The flow lives entirely client-side; the DB only records whether the
-- student finished (so the guard works across devices) and what they chose.
-- RLS is unchanged: the existing own-row UPDATE policy on profiles covers
-- these columns exactly like display_name/bio/privacy_* already are.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference text;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Set once the student exits the welcome flow (finish or skip). NULL = not yet seen.';
COMMENT ON COLUMN public.profiles.onboarding_data IS 'Onboarding choices: completedSteps, subjects, examTarget, dailyGoalMinutes, finalized.';
COMMENT ON COLUMN public.profiles.theme_preference IS 'Chosen appearance: dark | light. Mirrors next-themes localStorage for cross-device.';
