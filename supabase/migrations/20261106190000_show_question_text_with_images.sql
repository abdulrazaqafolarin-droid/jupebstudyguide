-- Keep image-based questions readable: show the image and its question text together.
-- Idempotent; avoid dropping an existing constraint so rollout is non-disruptive.
-- The original study_questions table migration predates image support.
-- Match the nullable text column already present in deployed environments.
ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS image_position TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.study_questions'::regclass
      AND conname = 'study_questions_image_position_check'
  ) THEN
    ALTER TABLE public.study_questions
      ADD CONSTRAINT study_questions_image_position_check
      CHECK (image_position IS NULL OR image_position IN ('text-only', 'image-only', 'image-above', 'image-beside'));
  END IF;
END $$;

UPDATE public.study_questions
SET image_position = 'image-above'
WHERE image_url IS NOT NULL
  AND COALESCE(image_position, 'image-only') IN ('image-only', 'text-only');
