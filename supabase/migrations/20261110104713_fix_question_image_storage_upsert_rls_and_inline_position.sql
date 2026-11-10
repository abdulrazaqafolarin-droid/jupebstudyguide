-- Allow the stable inline image anchor emitted by the admin question editor.
ALTER TABLE public.study_questions
  DROP CONSTRAINT IF EXISTS study_questions_image_position_check;

ALTER TABLE public.study_questions
  ADD CONSTRAINT study_questions_image_position_check
  CHECK (
    image_position IS NULL
    OR image_position IN ('text-only', 'image-only', 'image-above', 'image-beside')
    OR image_position ~ '^image-inline:[0-9]+$'
  );

-- Publicly readable question illustrations remain student-accessible.
-- Only users flagged as admins in profiles may upload, replace, or delete them.
-- Storage upsert requires INSERT, SELECT, and UPDATE policies.
DROP POLICY IF EXISTS "Admins can upload question images" ON storage.objects;
CREATE POLICY "Admins can upload question images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'question-images'
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.is_admin IS TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can update question images" ON storage.objects;
CREATE POLICY "Admins can update question images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'question-images'
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.is_admin IS TRUE
    )
  )
  WITH CHECK (
    bucket_id = 'question-images'
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.is_admin IS TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can delete question images" ON storage.objects;
CREATE POLICY "Admins can delete question images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'question-images'
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.is_admin IS TRUE
    )
  );
