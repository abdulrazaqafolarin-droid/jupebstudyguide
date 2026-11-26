-- The source 2015 Physics theory question asks students to solve a circuit
-- "below", but the available archived copy's text extraction does not preserve
-- the diagram's full wiring. Keep the row for future restoration but do not
-- expose the incomplete prompt to students.
UPDATE public.study_questions
SET hidden = true
WHERE id = 'physics-2015-theory-07'
  AND image_url IS NULL;

NOTIFY pgrst, 'reload schema';
