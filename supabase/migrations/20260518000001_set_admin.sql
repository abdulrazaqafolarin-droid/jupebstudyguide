-- Set admin privileges for the platform owner
-- This runs as a one-time migration to grant admin access

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find the user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'abdulrazaqafolarin@gmail.com';

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET is_admin = true
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
      -- Profile doesn't exist yet, create one
      INSERT INTO public.profiles (user_id, display_name, is_admin)
      VALUES (v_user_id, 'Admin', true);
    END IF;

    RAISE NOTICE 'Admin privileges granted to abdulrazaqafolarin@gmail.com';
  ELSE
    RAISE NOTICE 'User abdulrazaqafolarin@gmail.com not found in auth.users. Create account first, then set is_admin manually.';
  END IF;
END;
$$;
