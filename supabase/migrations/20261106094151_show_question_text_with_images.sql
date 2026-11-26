UPDATE public.study_questions
SET image_position = 'image-above'
WHERE image_url IS NOT NULL
  AND COALESCE(image_position, 'image-only') IN ('image-only', 'text-only');
