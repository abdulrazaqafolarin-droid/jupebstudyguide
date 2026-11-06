-- Focused question-bank quality repairs from the 2026-11-06 audit.
-- Rows that cannot be completed safely are hidden, not deleted, until their
-- original figures or answer choices can be recovered.

-- Restore the verified Mathematics velocity-time graph.
UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/math-2021-velocity-time.svg'
WHERE id = 'mat-2021-mq-0039';

-- Correct the asteroid-orbit explanation and restore its schematic.
UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2017-asteroid-orbit.svg',
    explanation = 'As the asteroid moves from P toward Q, it approaches the Sun. Its gravitational potential energy decreases and its speed increases, so its kinetic energy increases. Angular momentum and total mechanical energy are conserved. Therefore option D is correct.'
WHERE id = 'physics-2017-objective-002';

-- Restore the 2020 truck-track diagram and align its explanation with the
-- 60 m height drop and the published option D.
UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-truck-track.svg',
    explanation = 'On a frictionless track, mechanical energy is conserved. At the lowest point, the loss of gravitational potential energy is the maximum kinetic energy. Using the 60 m vertical drop: KE = mgh = 150 × 10 × 60 = 90,000 J = 90 kJ. Therefore option D is correct.'
WHERE id = 'physics-2020-objective-005';

-- Restore the Compton-scattering illustration and correct the scattered
-- photon wavelength unit to nanometres, as given in the official paper.
UPDATE public.study_questions
SET image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-compton-scattering.svg',
    question = replace(question, '0.0038cm', '0.0038nm')
WHERE id = 'physics-2020-theory-08';

-- Restore the official 2020 force-extension curve and battery circuit.
UPDATE public.study_questions
SET hidden = false,
    image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-force-extension.svg'
WHERE id = 'physics-2020-theory-01';

UPDATE public.study_questions
SET hidden = false,
    question = replace(
      replace(question, 'thermal resistance', 'internal resistance'),
      'Kirchoff', 'Kirchhoff'
    ),
    image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2020-battery-circuit-vi.svg'
WHERE id = 'physics-2020-theory-05';

-- Restore the 2021 wire/current circuit diagram.
UPDATE public.study_questions
SET hidden = false,
    image_url = 'https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/main/public/question-images/physics-2021-wire-current.svg'
WHERE id = 'physics-2021-theory-08';

-- Correct the coil torque question against the official 2020 paper.
-- The rectangular coil area is 0.030 m × 0.020 m = 0.0006 m².
-- Torque = N B I A = 200 × 0.8 × 0.5 × 0.0006 = 0.048 N m.
UPDATE public.study_questions
SET options = CASE
      WHEN jsonb_typeof(options) = 'string' THEN
        to_jsonb(jsonb_set(
          (options #>> '{}')::jsonb,
          '{2,text}',
          to_jsonb('0.048 Nm'::text)
        )::text)
      WHEN jsonb_typeof(options) = 'array' THEN
        jsonb_set(options, '{2,text}', to_jsonb('0.048 Nm'::text))
      ELSE options
    END,
    explanation = 'The rectangular coil area is length × diameter = 0.030 × 0.020 = 0.0006 m². Torque = N B I A = 200 × 0.8 × 0.5 × 0.0006 = 0.048 N m. Therefore option C is correct.'
WHERE id = 'physics-2020-objective-016';

-- The official de Broglie question specifies 3.0 × 10^6 m/s.
-- This makes 2.43 × 10^-10 m, option B, the correct answer.
UPDATE public.study_questions
SET question = replace(question, '10^4', '10^6'),
    correct_answer = 'B',
    explanation = 'The de Broglie wavelength is lambda = h/(mv) = (6.63 × 10^-34)/(9.11 × 10^-31 × 3.0 × 10^6) = 2.43 × 10^-10 m. Therefore option B is correct.'
WHERE id = 'physics-2020-objective-023';

-- Restore the official 2020 thermometric-liquid options and answer.
-- The official JUPEB paper lists C = "II and III" and D = "IV and V";
-- IV and V are the unsuitable properties.
UPDATE public.study_questions
SET question = 'I. It should be a good conductor of heat. II. It should be opaque. III. Its expansion should be regular. IV. It should wet glass. V. It should have a high melting point and low boiling point. Which of the above properties are NOT those of a suitable thermometric liquid?',
    options = CASE
      WHEN jsonb_typeof(options) = 'string' THEN
        to_jsonb(jsonb_set(
          (options #>> '{}')::jsonb,
          '{2,text}',
          to_jsonb('II and III'::text)
        )::text)
      WHEN jsonb_typeof(options) = 'array' THEN
        jsonb_set(options, '{2,text}', to_jsonb('II and III'::text))
      ELSE options
    END,
    correct_answer = 'D',
    explanation = 'A suitable thermometric liquid should conduct heat well, be visible in the tube, expand regularly, not wet the glass, and have a high boiling point with a low melting point. Statements IV and V are unsuitable, so option D is correct.'
WHERE id = 'physics-2020-objective-049';

-- These figure-dependent records have no recoverable source diagram. Hide them
-- until the exact 2014 vector and 2024 capacitor-network layouts are restored.
UPDATE public.study_questions
SET hidden = true
WHERE id IN (
  'physics-2014-theory-01-005',
  'physics-2024-theory-06'
);

-- The stored 2020 fundamental/derived quantities item has duplicate C and D
-- answer text. Hide it until the complete official choices are recovered.
UPDATE public.study_questions
SET hidden = true
WHERE id = 'physics-2020-objective-014';

-- Keep one copy of the duplicated 2021 Biology photosynthesis objective.
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

-- Hide the remaining visible objective records with duplicate answer-choice
-- text. Their intended distractors cannot be recovered from the current bank
-- transcription; keeping them visible would present ambiguous/duplicated MCQs.
-- These rows are retained and can be restored after source wording is verified.
UPDATE public.study_questions
SET hidden = true
WHERE id IN (
  'bio-2019-objective-042',
  'bio-2024-objective-032',
  'chemistry-2014-objective-012',
  'che-2017-q0036',
  'chemistry-2025-objective-019',
  'chemistry-2025-objective-024',
  'mat-2016-mq-0009',
  'mat-2016-mq-0011',
  'mat-2016-mq-0040',
  'mat-2017-mq-0003',
  'mat-2019-mq-0025',
  'mat-2019-mq-0028',
  'mat-2019-objective-r11',
  'mat-2020-mq-0038',
  'mat-2022-obj-0001',
  'physics-2014-objective-045',
  'physics-2015-objective-011',
  'physics-2016-objective-047',
  'physics-2018-objective-020',
  'physics-2018-objective-031'
);

NOTIFY pgrst, 'reload schema';
