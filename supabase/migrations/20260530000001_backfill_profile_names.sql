
-- Backfill null display_name values for profiles
-- This handles users who signed up before the trigger was in place
UPDATE profiles p
SET display_name = COALESCE(
  p.display_name,
  (SELECT split_part(u.email, '@', 1) FROM auth.users u WHERE u.id = p.user_id),
  'User'
)
WHERE display_name IS NULL;
