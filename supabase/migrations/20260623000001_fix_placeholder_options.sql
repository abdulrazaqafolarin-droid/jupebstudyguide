-- Run this SQL in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/gzyczowqqywesqhqqpdi/sql/new)
-- 
-- Fix 1: Replace "--" placeholder option text with "None of the above"
-- These options had "--" because the answer hadn't been filled in yet.
-- The MathRenderer would show "--" as is, which is confusing.

BEGIN;

-- physics-2019-objective-002: Option D was "--"
UPDATE study_questions
SET options = jsonb_set(options, '{3,text}', '"None of the above"')
WHERE id = 'physics-2019-objective-002' AND options->3->>'text' = '--';

-- physics-2019-objective-009: Option D was "--"
UPDATE study_questions
SET options = jsonb_set(options, '{3,text}', '"None of the above"')
WHERE id = 'physics-2019-objective-009' AND options->3->>'text' = '--';

-- physics-2019-objective-010: Option D was "--"
UPDATE study_questions
SET options = jsonb_set(options, '{3,text}', '"None of the above"')
WHERE id = 'physics-2019-objective-010' AND options->3->>'text' = '--';

-- physics-2019-objective-037: Options B, C, D were "--"
UPDATE study_questions
SET options = jsonb_set(jsonb_set(jsonb_set(options, '{1,text}', '"None of the above"'), '{2,text}', '"None of the above"'), '{3,text}', '"None of the above"')
WHERE id = 'physics-2019-objective-037' AND options->1->>'text' = '--';

-- physics-2019-objective-039: Options C, D were "--"
UPDATE study_questions
SET options = jsonb_set(jsonb_set(options, '{2,text}', '"None of the above"'), '{3,text}', '"None of the above"')
WHERE id = 'physics-2019-objective-039' AND options->2->>'text' = '--';

-- physics-2019-objective-046: Option D was "--"
UPDATE study_questions
SET options = jsonb_set(options, '{3,text}', '"None of the above"')
WHERE id = 'physics-2019-objective-046' AND options->3->>'text' = '--';

-- physics-2021-objective-015: Option C was "--"
UPDATE study_questions
SET options = jsonb_set(options, '{2,text}', '"None of the above"')
WHERE id = 'physics-2021-objective-015' AND options->2->>'text' = '--';

-- physics-2021-objective-011: Option D was "--"
UPDATE study_questions
SET options = jsonb_set(options, '{3,text}', '"None of the above"')
WHERE id = 'physics-2021-objective-011' AND options->3->>'text' = '--';

COMMIT;

-- Verify the fixes
SELECT id, subject, year, 
  options->0->>'text' as opt_a,
  options->1->>'text' as opt_b,
  options->2->>'text' as opt_c,
  options->3->>'text' as opt_d
FROM study_questions
WHERE id IN (
  'physics-2019-objective-002',
  'physics-2019-objective-009',
  'physics-2019-objective-010',
  'physics-2019-objective-037',
  'physics-2019-objective-039',
  'physics-2019-objective-046',
  'physics-2021-objective-015',
  'physics-2021-objective-011'
);
