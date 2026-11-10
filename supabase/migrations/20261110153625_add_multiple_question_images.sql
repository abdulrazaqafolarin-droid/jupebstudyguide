ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.study_questions
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND (image_urls IS NULL OR image_urls = '[]'::jsonb);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'study_questions_image_urls_is_array'
      AND conrelid = 'public.study_questions'::regclass
  ) THEN
    ALTER TABLE public.study_questions
      ADD CONSTRAINT study_questions_image_urls_is_array
      CHECK (jsonb_typeof(image_urls) = 'array')
      NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.study_questions
  VALIDATE CONSTRAINT study_questions_image_urls_is_array;
