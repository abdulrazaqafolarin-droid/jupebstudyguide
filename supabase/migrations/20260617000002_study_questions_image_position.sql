ALTER TABLE public.study_questions ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT 'image-only'
  CHECK (image_position IN ('text-only', 'image-only', 'image-above', 'image-beside'));

-- Backfill existing rows that have image_url but null image_position
UPDATE public.study_questions
SET image_position = 'image-only'
WHERE image_url IS NOT NULL AND image_position IS NULL;
