-- Local-only system account required by the signup trigger's welcome DM.
-- This matches the deployed StudyBot identity; no production secrets or user
-- data are seeded. The migration/test database is disposable.
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'studybot@jupebstudyguide.app',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"StudyBot"}'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
