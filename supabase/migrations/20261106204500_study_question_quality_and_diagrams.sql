-- Focused question-bank quality repairs from the 2026-11-06 audit.
-- Keep data recoverable: incomplete image-dependent theory questions are hidden,
-- not deleted, until their original source diagrams are restored.

UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/math-2021-velocity-time.svg'
WHERE id = 'mat-2021-mq-0039' AND COALESCE(hidden, false) = false;

UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2017-asteroid-orbit.svg',
    explanation = 'As the asteroid moves from P toward Q, it approaches the Sun. Its gravitational potential energy becomes lower and its speed increases, so its kinetic energy increases. Angular momentum and total mechanical energy are conserved (D).'
WHERE id = 'physics-2017-objective-002' AND COALESCE(hidden, false) = false;

UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-truck-track.svg',
    explanation = 'On a frictionless track, mechanical energy is conserved. At the lowest point, the loss of gravitational potential energy is the maximum kinetic energy. Using the 60 m vertical drop in the worked solution: KE = mgh = 150 × 10 × 60 = 90,000 J = 90 kJ. Therefore, option D is correct.'
WHERE id = 'physics-2020-objective-005' AND COALESCE(hidden, false) = false;

UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-compton-scattering.svg',
    question = replace(question, '0.0038cm', '0.0038nm')
WHERE id = 'physics-2020-theory-08' AND COALESCE(hidden, false) = false;

-- These records depend on diagrams/graphs which are not present in the stored
-- source and whose exact topology/values cannot safely be reconstructed.
-- Hiding them prevents a student from being asked to calculate from absent data.
-- Restore the two 2020 theory questions for which the official paper supplies
-- the complete original figure descriptions and axes.
UPDATE public.study_questions
SET hidden = false,
    image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-force-extension.svg'
WHERE id = 'physics-2020-theory-01';

UPDATE public.study_questions
SET hidden = false,
    image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-battery-circuit-vi.svg'
WHERE id = 'physics-2020-theory-05';

-- These records still depend on figures whose original source diagrams have
-- not yet been recovered. Hide them, rather than showing incomplete prompts.
UPDATE public.study_questions
SET hidden = true
WHERE id IN (
  'physics-2014-theory-01-005',
  'physics-2021-theory-08',
  'physics-2024-theory-06'
);

-- Keep one clean copy of the repeated 2021 Biology photosynthesis objective.
UPDATE public.study_questions
SET hidden = true
WHERE id = 'bio-2021-objective-r03'
  AND EXISTS (
    SELECT 1
    FROM public.study_questions duplicate
    WHERE duplicate.id = 'bio-2021-objective-r12'
      AND duplicate.hidden = false
      AND duplicate.subject = public.study_questions.subject
      AND duplicate.year = public.study_questions.year
      AND duplicate.category = public.study_questions.category
      AND lower(trim(duplicate.question)) = lower(trim(public.study_questions.question))
  );

NOTIFY pgrst, 'reload schema';
