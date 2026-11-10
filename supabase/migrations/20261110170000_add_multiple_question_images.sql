-- Preserve the existing single-image column for older clients while
-- storing the complete ordered image list for current clients.
ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.study_questions
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND (image_urls IS NULL OR image_urls = '[]'::jsonb);

ALTER TABLE public.study_questions
  ADD CONSTRAINT study_questions_image_urls_is_array
  CHECK (jsonb_typeof(image_urls) = 'array')
  NOT VALID;

ALTER TABLE public.study_questions
  VALIDATE CONSTRAINT study_questions_image_urls_is_array;
