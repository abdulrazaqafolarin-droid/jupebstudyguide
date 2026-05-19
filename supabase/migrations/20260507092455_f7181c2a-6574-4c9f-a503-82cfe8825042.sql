-- Public avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read avatars (public URLs)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar (path must start with their uid)
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger to auto-update profiles.updated_at
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile row for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();