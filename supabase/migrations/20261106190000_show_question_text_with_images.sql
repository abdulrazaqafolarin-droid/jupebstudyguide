-- Keep image-based questions readable: show the image and its question text together.
-- Idempotent and limited to rows that already have an image.
ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS image_position TEXT;

UPDATE public.study_questions
SET image_position = 'image-above'
WHERE image_url IS NOT NULL
  AND COALESCE(image_position, 'image-only') IN ('image-only', 'text-only');

ALTER TABLE public.study_questions
  DROP CONSTRAINT IF EXISTS study_questions_image_position_check;

ALTER TABLE public.study_questions
  ADD CONSTRAINT study_questions_image_position_check
  CHECK (image_position IS NULL OR image_position IN ('text-only', 'image-only', 'image-above', 'image-beside'));
