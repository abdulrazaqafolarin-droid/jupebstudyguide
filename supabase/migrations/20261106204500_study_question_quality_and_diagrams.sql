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

-- Restore the 2021 wire/current figure using the source circuit layout.
UPDATE public.study_questions
SET hidden = false,
    image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2021-wire-current.svg'
WHERE id = 'physics-2021-theory-08';

-- The 2014 vector diagram and 2024 capacitor-network topology are still absent
-- from the source records. Hide these prompts until their exact figures are
-- recovered rather than supplying a guessed diagram.
UPDATE public.study_questions
SET hidden = true
WHERE id IN (
  'physics-2014-theory-01-005',
  'physics-2024-theory-06'
);

-- Correct two 2020 Physics objective items against the official June 2020
-- JUPEB paper: the coil's rectangular turn area is 0.03 m × 0.02 m, and the
-- de Broglie item gives 3.0 × 10^6 m/s (not 10^4 m/s).
UPDATE public.study_questions
SET options = to_jsonb(
      jsonb_set(
        (options #>> '{}')::jsonb,
        '{2,text}',
        to_jsonb('$0.048\\,Nm
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
::text)
      )::text
    ),
    explanation = 'The coil is rectangular: area A = length × diameter = 0.030 × 0.020 = 6.0 × 10⁻⁴ m². Torque τ = N B I A = 200 × 0.8 × 0.5 × 6.0 × 10⁻⁴ = 0.048 N·m. Therefore option C is correct.'
WHERE id = 'physics-2020-objective-016';

UPDATE public.study_questions
SET question = replace(question, '10^4', '10^6'),
    correct_answer = 'B',
    explanation = 'The de Broglie wavelength is λ = h/(mv) = (6.63 × 10⁻³⁴)/(9.11 × 10⁻³¹ × 3.0 × 10⁶) = 2.43 × 10⁻¹⁰ m. Therefore option B is correct.'
WHERE id = 'physics-2020-objective-023';

-- Restore the official 2020 thermometric-liquid statements and option C.
UPDATE public.study_questions
SET question = 'I. It should be a good conductor of heat. II. It should be opaque. III. Its expansion should be regular. IV. It should wet glass. V. It should have a high melting point and low boiling point. Which of the above properties are NOT those of a suitable thermometric liquid?',
    options = to_jsonb(
      jsonb_set(
        (options #>> '{}')::jsonb,
        '{2,text}',
        to_jsonb('II and III'::text)
      )::text
    )
WHERE id = 'physics-2020-objective-049';

-- Question 10's stored options contain duplicate answer text for C and D.
-- Do not let students face two identical choices while the official option
-- transcription is incomplete.
UPDATE public.study_questions
SET hidden = true
WHERE id = 'physics-2020-objective-014';

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
