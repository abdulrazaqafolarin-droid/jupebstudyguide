-- ============================================================
-- Migration: Storage Bucket Fixes
-- Date: 2026-05-28
-- 
-- Fixes 5 gaps in Supabase storage configuration:
--   1. CREATE missing answer-images bucket (needed by useImageUpload.ts)
--   2. ADD DELETE policy to chat-files bucket (users couldn't delete files)
--   3. FIX chat-images DELETE policy (was permissive, now scoped to own folder)
--   4. TIGHTEN chat-files INSERT policy (was unscoped, now scoped to own folder)
--   5. TIGHTEN chat-images INSERT policy (was unscoped, now scoped to own folder)
--
-- Pattern used for per-user folder scoping:
--   auth.uid()::text = (storage.foldername(name))[1]
--   This matches the pattern already used by the avatars bucket.
-- ============================================================

-- ============================================================
-- FIX 1: Create answer-images storage bucket
-- ============================================================
-- This bucket is required by src/hooks/useImageUpload.ts line 137.
-- The previous migration (20260519000001_answer_images.sql) only created
-- the answer_images and answer_markings tables but NOT the bucket itself,
-- with a comment: "Requires bucket created via Supabase dashboard or API".
-- This fixes that gap permanently.

INSERT INTO storage.buckets (id, name, public)
VALUES ('answer-images', 'answer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone authenticated can view answer images (needed for review)
DROP POLICY IF EXISTS "Anyone can view answer images"
  ON storage.objects;
CREATE POLICY "Anyone can view answer images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'answer-images');

-- Users upload to their own folder: /{userId}/{uuid}.ext
DROP POLICY IF EXISTS "Users upload own answer images"
  ON storage.objects;
CREATE POLICY "Users upload own answer images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'answer-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own answer images
DROP POLICY IF EXISTS "Users update own answer images"
  ON storage.objects;
CREATE POLICY "Users update own answer images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'answer-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own answer images
DROP POLICY IF EXISTS "Users delete own answer images"
  ON storage.objects;
CREATE POLICY "Users delete own answer images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'answer-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- FIX 2: Add DELETE policy to chat-files bucket
-- ============================================================
-- The chat-files bucket (created in 20260524000001_profiles_privacy_messaging.sql)
-- only had INSERT and SELECT policies. Without a DELETE policy, users could
-- never delete their uploaded files, causing orphaned storage objects when
-- messages were deleted.

DROP POLICY IF EXISTS "Users can delete own chat files"
  ON storage.objects;

CREATE POLICY "Users can delete own chat files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- FIX 3: Fix chat-images DELETE policy (scope to own folder)
-- ============================================================
-- The previous policy (created in 20260527000001_chat_consolidation.sql)
-- was named "Authenticated users can delete own chat images" but only checked
-- auth.role() = 'authenticated', meaning ANY authenticated user could delete
-- ANY chat image. This was a security issue.
--
-- Fixed by dropping the old policy and recreating it with proper folder scoping.

DROP POLICY IF EXISTS "Authenticated users can delete own chat images"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat images"
  ON storage.objects;

CREATE POLICY "Users can delete own chat images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- FIX 4: Tighten chat-files INSERT policy (scope to own folder)
-- ============================================================
-- The original INSERT policy (created in
-- 20260524000001_profiles_privacy_messaging.sql) only checked
-- auth.role() = 'authenticated' — any authenticated user could
-- upload files into ANY folder. The frontend always uploads to
-- /{userId}/ so we scope the policy to match.
--
-- This prevents users from spraying files into other users' folders.

DROP POLICY IF EXISTS "Authenticated users can upload chat files"
  ON storage.objects;

CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- FIX 5: Tighten chat-images INSERT policy (scope to own folder)
-- ============================================================
-- Same issue as FIX 4 but for the chat-images bucket.
-- Frontend uploads to /{userId}/{uuid}.{ext} via useChat.ts:724.

DROP POLICY IF EXISTS "Authenticated users can upload chat images"
  ON storage.objects;

CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- VERIFICATION QUERIES (run these to confirm everything worked)
-- ============================================================
-- 
-- -- Check all chat-related buckets exist:
-- SELECT id, name, public FROM storage.buckets
-- WHERE id IN ('chat-images', 'chat-files', 'answer-images', 'avatars');
-- 
-- -- Check all policies on chat-images:
-- SELECT polname, polcmd, polroles::text, polqual::text, polwithcheck::text
-- FROM pg_policy
-- WHERE polrelid = 'storage.objects'::regclass
-- ORDER BY polname;
-- 
-- -- Expected output:
-- -- 1. answer-images bucket exists (id='answer-images', public=true)
-- -- 2. chat-files has INSERT + SELECT + DELETE policies (all folder-scoped)
-- -- 3. chat-images has INSERT + SELECT + DELETE policies (all folder-scoped)
-- -- 4. All INSERT/DELETE policies use: auth.uid()::text = (storage.foldername(name))[1]
