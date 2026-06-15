ALTER TABLE public.study_questions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_study_questions_sort_order ON public.study_questions(subject, year, category, sort_order);

-- Backfill sort_order for existing rows: assign sequential numbers per subject/year/category group
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY subject, year, category
    ORDER BY created_at ASC, id ASC
  ) - 1 AS new_order
  FROM public.study_questions
)
UPDATE public.study_questions sq
SET sort_order = n.new_order
FROM numbered n
WHERE sq.id = n.id
  AND (sq.sort_order IS NULL OR sq.sort_order = 0);
