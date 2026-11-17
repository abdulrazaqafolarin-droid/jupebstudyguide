-- PENDING JAMB WORKSPACE FOUNDATION
-- Target: the existing Rutex Supabase project gzyczowqqywesqhqqpdi only.
-- This is intentionally NOT in supabase/migrations/ and MUST NOT be applied
-- until the remote-only migration history has been recovered and reconciled.
-- See docs/MIGRATION_RECONCILIATION_REQUIRED.md.
--
-- The script is transaction-wrapped and largely idempotent. It is a reviewed
-- migration candidate, not a substitute for a matching local baseline.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Programme registry and versioned configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_programs (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  current_exam_year INTEGER,
  config_version TEXT NOT NULL DEFAULT '1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exam_programs_id_check CHECK (id IN ('jupeb', 'jamb'))
);

INSERT INTO public.exam_programs
  (id, display_name, slug, description, is_active, current_exam_year, config_version)
VALUES
  ('jupeb', 'JUPEB', 'jupeb', 'Joint Universities Preliminary Examinations Board preparation', true, 2027, '1'),
  ('jamb', 'JAMB', 'jamb', 'UTME examination preparation workspace', true, 2027, '1')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  current_exam_year = EXCLUDED.current_exam_year,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.exam_program_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_compulsory BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_program_id, subject_code)
);

INSERT INTO public.exam_program_subjects
  (exam_program_id, subject_code, display_name, is_compulsory, is_available, sort_order, metadata)
VALUES
  ('jupeb', 'physics', 'Physics', false, true, 1, '{}'::jsonb),
  ('jupeb', 'chemistry', 'Chemistry', false, true, 2, '{}'::jsonb),
  ('jupeb', 'biology', 'Biology', false, true, 3, '{}'::jsonb),
  ('jupeb', 'mathematics', 'Mathematics', false, true, 4, '{}'::jsonb),
  ('jamb', 'physics', 'Physics', false, true, 1, '{"initial_content_pack": true}'::jsonb),
  ('jamb', 'chemistry', 'Chemistry', false, true, 2, '{"initial_content_pack": true}'::jsonb),
  ('jamb', 'biology', 'Biology', false, true, 3, '{"initial_content_pack": true}'::jsonb),
  ('jamb', 'use_of_english', 'Use of English', true, false, 4, '{"full_mock_dependency": true, "content_loaded": false}'::jsonb),
  ('jamb', 'mathematics', 'Mathematics', false, false, 5, '{"content_loaded": false}'::jsonb)
ON CONFLICT (exam_program_id, subject_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_compulsory = EXCLUDED.is_compulsory,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata;

CREATE TABLE IF NOT EXISTS public.exam_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id) ON DELETE CASCADE,
  exam_year INTEGER NOT NULL,
  config_version TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_url TEXT,
  source_document TEXT,
  source_sha256 TEXT,
  official_format_verified BOOLEAN NOT NULL DEFAULT false,
  full_mock_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_program_id, exam_year, config_version),
  CONSTRAINT exam_configurations_status_check
    CHECK (status IN ('draft', 'published', 'retired'))
);

-- This is a published Rutex subject-practice preset, not a verified official
-- JAMB exam-format configuration. Full four-subject mocks remain disabled.
INSERT INTO public.exam_configurations
  (exam_program_id, exam_year, config_version, settings, official_format_verified, full_mock_enabled, status, published_at)
VALUES
  (
    'jamb',
    2027,
    'rutex-practice-v1',
    '{
      "practice_only": true,
      "allowed_subjects": ["physics", "chemistry", "biology"],
      "allowed_question_counts": [10, 20, 40],
      "duration_by_question_count": {"10": 10, "20": 20, "40": 40},
      "question_category": "objective",
      "full_mock_dependency": "use_of_english"
    }'::jsonb,
    false,
    false,
    'published',
    now()
  )
ON CONFLICT (exam_program_id, exam_year, config_version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Import batches, staging records and answer-key isolation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id),
  source_document TEXT NOT NULL,
  source_storage_path TEXT,
  source_sha256 TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  rights_confirmed BOOLEAN NOT NULL DEFAULT false,
  rights_note TEXT,
  status TEXT NOT NULL DEFAULT 'staged',
  total_items INTEGER NOT NULL DEFAULT 0,
  expected_items INTEGER NOT NULL DEFAULT 0,
  needs_review_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  published_count INTEGER NOT NULL DEFAULT 0,
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT question_import_batches_status_check
    CHECK (status IN ('staged', 'reviewing', 'approved', 'published', 'rejected', 'failed')),
  CONSTRAINT question_import_batches_source_hash_check
    CHECK (source_sha256 ~ '^[a-f0-9]{64}$')
);

ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS exam_program_id TEXT NOT NULL DEFAULT 'jupeb',
  ADD COLUMN IF NOT EXISTS source_batch_id UUID,
  ADD COLUMN IF NOT EXISTS source_ref TEXT,
  ADD COLUMN IF NOT EXISTS source_document TEXT,
  ADD COLUMN IF NOT EXISTS source_page INTEGER,
  ADD COLUMN IF NOT EXISTS source_question_number TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Every existing record is JUPEB by default. Never relabel legacy records as JAMB.
UPDATE public.study_questions
SET exam_program_id = 'jupeb'
WHERE exam_program_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_questions_exam_program_id_fkey'
  ) THEN
    ALTER TABLE public.study_questions
      ADD CONSTRAINT study_questions_exam_program_id_fkey
      FOREIGN KEY (exam_program_id) REFERENCES public.exam_programs(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_questions_review_status_check'
  ) THEN
    ALTER TABLE public.study_questions
      ADD CONSTRAINT study_questions_review_status_check
      CHECK (review_status IN ('needs_review', 'approved', 'approved_ungraded', 'published', 'retired'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_questions_source_batch_id_fkey'
  ) THEN
    ALTER TABLE public.study_questions
      ADD CONSTRAINT study_questions_source_batch_id_fkey
      FOREIGN KEY (source_batch_id) REFERENCES public.question_import_batches(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_questions_reviewed_by_fkey'
  ) THEN
    ALTER TABLE public.study_questions
      ADD CONSTRAINT study_questions_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS study_questions_program_subject_year_idx
  ON public.study_questions (exam_program_id, subject, year, category, review_status, hidden, sort_order);
CREATE INDEX IF NOT EXISTS study_questions_source_batch_idx
  ON public.study_questions (source_batch_id) WHERE source_batch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS study_questions_program_content_hash_uidx
  ON public.study_questions (exam_program_id, subject, content_hash)
  WHERE content_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS question_import_batches_source_uidx
  ON public.question_import_batches (exam_program_id, subject_code, source_sha256);

CREATE TABLE IF NOT EXISTS public.question_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.question_import_batches(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB NOT NULL,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'needs_review',
  duplicate_of UUID REFERENCES public.question_import_items(id) ON DELETE SET NULL,
  published_question_id TEXT REFERENCES public.study_questions(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, item_number),
  CONSTRAINT question_import_items_status_check
    CHECK (status IN ('needs_review', 'approved', 'approved_ungraded', 'rejected', 'published'))
);
CREATE INDEX IF NOT EXISTS question_import_items_batch_status_idx
  ON public.question_import_items (batch_id, status, item_number);

CREATE TABLE IF NOT EXISTS public.study_question_answer_keys (
  question_id TEXT PRIMARY KEY REFERENCES public.study_questions(id) ON DELETE CASCADE,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  review_status TEXT NOT NULL DEFAULT 'needs_review',
  source_ref TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT study_question_answer_keys_status_check
    CHECK (review_status IN ('needs_review', 'approved', 'rejected'))
);

-- ---------------------------------------------------------------------------
-- 3. Versioned syllabus tables; no unverified JAMB topics are seeded
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_syllabus_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id),
  exam_year INTEGER NOT NULL,
  version TEXT NOT NULL,
  source_title TEXT,
  source_url TEXT,
  source_document_path TEXT,
  source_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_program_id, exam_year, version),
  CONSTRAINT exam_syllabus_versions_status_check
    CHECK (status IN ('draft', 'verified', 'published', 'retired'))
);

CREATE TABLE IF NOT EXISTS public.exam_syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_version_id UUID NOT NULL REFERENCES public.exam_syllabus_versions(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  topic_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_topic_id UUID REFERENCES public.exam_syllabus_topics(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'needs_review',
  source_ref TEXT,
  UNIQUE (syllabus_version_id, subject_code, topic_code)
);

-- ---------------------------------------------------------------------------
-- 4. Attempts and programme-scoped learner data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id),
  exam_year INTEGER NOT NULL,
  config_version TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  attempt_kind TEXT NOT NULL DEFAULT 'subject_practice',
  status TEXT NOT NULL DEFAULT 'in_progress',
  duration_minutes INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  score_summary JSONB,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exam_attempts_status_check
    CHECK (status IN ('created', 'instructions', 'in_progress', 'submitting', 'submitted', 'expired', 'abandoned', 'interrupted')),
  CONSTRAINT exam_attempts_kind_check
    CHECK (attempt_kind IN ('subject_practice', 'full_mock', 'multi_subject_practice')),
  UNIQUE (user_id, exam_program_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS exam_attempts_user_program_status_idx
  ON public.exam_attempts (user_id, exam_program_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.exam_attempt_questions (
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  question_id TEXT NOT NULL REFERENCES public.study_questions(id),
  subject_code TEXT NOT NULL,
  question_snapshot JSONB NOT NULL,
  PRIMARY KEY (attempt_id, sequence),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.exam_attempt_answers (
  attempt_id UUID NOT NULL,
  question_sequence INTEGER NOT NULL,
  selected_option TEXT,
  marked_for_review BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_sequence),
  FOREIGN KEY (attempt_id, question_sequence)
    REFERENCES public.exam_attempt_questions(attempt_id, sequence) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.exam_user_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id),
  question_id TEXT NOT NULL REFERENCES public.study_questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_program_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.exam_user_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_program_id TEXT NOT NULL REFERENCES public.exam_programs(id),
  question_id TEXT NOT NULL REFERENCES public.study_questions(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_answered_at TIMESTAMPTZ,
  last_selected_option TEXT,
  viewed_count INTEGER NOT NULL DEFAULT 0 CHECK (viewed_count >= 0),
  PRIMARY KEY (user_id, exam_program_id, question_id)
);

-- ---------------------------------------------------------------------------
-- 5. Search document rebuild and programme-safe hybrid retrieval RPCs
-- ---------------------------------------------------------------------------
-- Preserve the live JUPEB search_document and its current GIN index.
-- A separate generated document makes programme scoping additive and avoids
-- rebuilding or replacing the existing search surface.
ALTER TABLE public.study_questions
  ADD COLUMN IF NOT EXISTS search_document_program TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(exam_program_id, '') || ' ' ||
      coalesce(id, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(year::text, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(course, '') || ' ' ||
      coalesce(question, '') || ' ' ||
      coalesce(options::text, '')
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS study_questions_search_document_program_gin_idx
  ON public.study_questions USING GIN (search_document_program);

DROP FUNCTION IF EXISTS public.match_study_questions(
  extensions.vector, double precision, integer, text, integer, text
);
CREATE OR REPLACE FUNCTION public.match_study_questions(
  query_embedding extensions.vector,
  match_threshold double precision,
  match_count integer,
  filter_subject text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_exam_program text DEFAULT 'jupeb'
)
RETURNS TABLE(
  question_id text,
  exam_program_id text,
  subject text,
  year integer,
  category text,
  question text,
  options jsonb,
  correct_answer text,
  explanation text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    q.id,
    q.exam_program_id,
    q.subject,
    q.year,
    q.category,
    q.question,
    q.options,
    coalesce(ak.correct_answer, q.correct_answer) AS correct_answer,
    coalesce(ak.explanation, q.explanation) AS explanation,
    1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity
  FROM public.study_question_embeddings AS e
  JOIN public.study_questions AS q ON q.id = e.question_id
  LEFT JOIN public.study_question_answer_keys AS ak
    ON ak.question_id = q.id AND ak.review_status = 'approved'
  WHERE q.hidden IS NOT TRUE
    AND q.review_status = 'published'
    AND e.source_updated_at = q.updated_at
    AND q.exam_program_id = coalesce(filter_exam_program, 'jupeb')
    AND (filter_subject IS NULL OR q.subject = filter_subject)
    AND (filter_year IS NULL OR q.year = filter_year)
    AND (filter_category IS NULL OR q.category = filter_category)
    AND 1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) > match_threshold
  ORDER BY e.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 30);
$function$;

DROP FUNCTION IF EXISTS public.match_study_questions_text(text, integer, text, integer, text);
CREATE OR REPLACE FUNCTION public.match_study_questions_text(
  query_text text,
  match_count integer DEFAULT 8,
  filter_subject text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_exam_program text DEFAULT 'jupeb'
)
RETURNS TABLE(
  question_id text,
  exam_program_id text,
  subject text,
  year integer,
  category text,
  question text,
  options jsonb,
  correct_answer text,
  explanation text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    q.id,
    q.exam_program_id,
    q.subject,
    q.year,
    q.category,
    q.question,
    q.options,
    coalesce(ak.correct_answer, q.correct_answer) AS correct_answer,
    coalesce(ak.explanation, q.explanation) AS explanation,
    ts_rank_cd(q.search_document_program, websearch_to_tsquery('simple', query_text))::FLOAT AS similarity
  FROM public.study_questions AS q
  LEFT JOIN public.study_question_answer_keys AS ak
    ON ak.question_id = q.id AND ak.review_status = 'approved'
  WHERE q.hidden IS NOT TRUE
    AND q.review_status = 'published'
    AND NULLIF(btrim(query_text), '') IS NOT NULL
    AND q.search_document_program @@ websearch_to_tsquery('simple', query_text)
    AND q.exam_program_id = coalesce(filter_exam_program, 'jupeb')
    AND (filter_subject IS NULL OR q.subject = filter_subject)
    AND (filter_year IS NULL OR q.year = filter_year)
    AND (filter_category IS NULL OR q.category = filter_category)
  ORDER BY ts_rank_cd(q.search_document, websearch_to_tsquery('simple', query_text)) DESC,
           q.year DESC,
           q.id
  LIMIT LEAST(GREATEST(COALESCE(match_count, 8), 1), 30);
$function$;

REVOKE ALL ON FUNCTION public.match_study_questions(
  extensions.vector, double precision, integer, text, integer, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_study_questions(
  extensions.vector, double precision, integer, text, integer, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.match_study_questions_text(
  text, integer, text, integer, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_study_questions_text(
  text, integer, text, integer, text, text
) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Transactional staging-to-publication operation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_jamb_question_batch(
  p_batch_id UUID,
  p_actor UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_batch public.question_import_batches%ROWTYPE;
  v_item RECORD;
  v_payload JSONB;
  v_options JSONB;
  v_question_id TEXT;
  v_subject TEXT;
  v_year INTEGER;
  v_answer TEXT;
  v_answer_verified BOOLEAN;
  v_published INTEGER := 0;
  v_ungraded INTEGER := 0;
BEGIN
  SELECT * INTO v_batch
  FROM public.question_import_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch not found';
  END IF;
  IF v_batch.exam_program_id <> 'jamb' THEN
    RAISE EXCEPTION 'Only JAMB batches can be published through this operation';
  END IF;
  IF v_batch.status = 'published' THEN
    RETURN jsonb_build_object(
      'batch_id', p_batch_id,
      'status', 'published',
      'published_count', v_batch.published_count,
      'idempotent_replay', true
    );
  END IF;
  IF v_batch.rights_confirmed IS NOT TRUE THEN
    RAISE EXCEPTION 'Source-use permission must be confirmed before publication';
  END IF;
  IF v_batch.status NOT IN ('staged', 'reviewing', 'approved') THEN
    RAISE EXCEPTION 'Batch is not in a publishable state';
  END IF;
  IF v_batch.total_items <> v_batch.expected_items THEN
    RAISE EXCEPTION 'Not all source candidates have been staged (expected %, staged %)', v_batch.expected_items, v_batch.total_items;
  END IF;
  IF EXISTS (SELECT 1 FROM public.question_import_items WHERE batch_id = p_batch_id AND status = 'needs_review') THEN
    RAISE EXCEPTION 'Every staged item must be reviewed before batch publication';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_actor AND is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Administrator permission required';
  END IF;


  IF EXISTS (
    SELECT 1
    FROM public.question_import_items
    WHERE batch_id = p_batch_id
      AND status IN ('approved', 'approved_ungraded')
      AND NULLIF(normalized_payload->>'content_hash', '') IS NOT NULL
    GROUP BY normalized_payload->>'content_hash'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'The batch contains duplicate question fingerprints; reject or correct duplicate items before publication';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.question_import_items i
    JOIN public.study_questions q
      ON q.exam_program_id = 'jamb'
     AND q.subject = i.normalized_payload->>'subject'
     AND q.content_hash = i.normalized_payload->>'content_hash'
    WHERE i.batch_id = p_batch_id
      AND i.status IN ('approved', 'approved_ungraded')
      AND NULLIF(i.normalized_payload->>'content_hash', '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'One or more approved items already exist in the published JAMB question bank';
  END IF;

  FOR v_item IN
    SELECT * FROM public.question_import_items
    WHERE batch_id = p_batch_id
      AND status IN ('approved', 'approved_ungraded')
    ORDER BY item_number
  LOOP
    v_payload := v_item.normalized_payload;
    v_subject := v_payload->>'subject';
    v_year := nullif(v_payload->>'year', '')::INTEGER;
    v_options := v_payload->'options';
    v_answer := nullif(upper(btrim(v_payload->>'correct_answer')), '');
    v_answer_verified := coalesce((v_payload->>'answer_key_verified')::BOOLEAN, false);

    IF v_subject NOT IN ('physics', 'chemistry', 'biology') THEN
      RAISE EXCEPTION 'Unsupported JAMB subject on item %', v_item.item_number;
    END IF;
    IF v_subject IS DISTINCT FROM v_batch.subject_code THEN
      RAISE EXCEPTION 'Item subject does not match its source batch on item %', v_item.item_number;
    END IF;
    IF v_year IS NULL OR v_year < 1970 OR v_year > 2100 THEN
      RAISE EXCEPTION 'A verified source year is required before publishing item %', v_item.item_number;
    END IF;
    IF length(btrim(coalesce(v_payload->>'question', ''))) < 8 THEN
      RAISE EXCEPTION 'Question text is too short on item %', v_item.item_number;
    END IF;
    IF jsonb_typeof(v_options) <> 'array' OR jsonb_array_length(v_options) NOT IN (4, 5) THEN
      RAISE EXCEPTION 'Four or five source options are required before publishing item %', v_item.item_number;
    END IF;
    IF (
      SELECT array_agg(upper(option->>'label') ORDER BY upper(option->>'label'))
      FROM jsonb_array_elements(v_options) AS option
    ) IS DISTINCT FROM ARRAY['A', 'B', 'C', 'D']::TEXT[]
    AND (
      SELECT array_agg(upper(option->>'label') ORDER BY upper(option->>'label'))
      FROM jsonb_array_elements(v_options) AS option
    ) IS DISTINCT FROM ARRAY['A', 'B', 'C', 'D', 'E']::TEXT[] THEN
      RAISE EXCEPTION 'Options A-D or A-E must be present exactly once on item %', v_item.item_number;
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_options) AS option
      WHERE length(btrim(coalesce(option->>'text', ''))) = 0
    ) THEN
      RAISE EXCEPTION 'All four option texts are required on item %', v_item.item_number;
    END IF;
    IF coalesce(jsonb_array_length(v_payload->'figure_descriptions'), 0) > 0
       AND coalesce(jsonb_array_length(v_payload->'image_urls'), 0) = 0 THEN
      RAISE EXCEPTION 'Figure-based item % must have its original image attached and reviewed', v_item.item_number;
    END IF;
    IF v_answer_verified AND (
      v_answer IS NULL
      OR v_answer NOT IN ('A', 'B', 'C', 'D', 'E')
      OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_options) AS option
        WHERE upper(option->>'label') = v_answer
      )
    ) THEN
      RAISE EXCEPTION 'Verified answer key must match one of the source options on item %', v_item.item_number;
    END IF;
    IF v_item.status = 'approved' AND NOT v_answer_verified THEN
      RAISE EXCEPTION 'Use approved_ungraded for an item without a reviewed answer key (item %)', v_item.item_number;
    END IF;
    IF v_item.status = 'approved_ungraded' AND v_answer_verified THEN
      RAISE EXCEPTION 'An answer-verified item must use approved status (item %)', v_item.item_number;
    END IF;

    v_question_id := 'jamb-' || replace(gen_random_uuid()::TEXT, '-', '');
    INSERT INTO public.study_questions (
      id, exam_program_id, subject, year, category, question, options,
      correct_answer, explanation, difficulty, course, sort_order,
      image_url, image_urls, image_position, hidden, review_status,
      source_batch_id, source_ref, source_document, source_page,
      source_question_number, content_hash, reviewed_by, reviewed_at
    ) VALUES (
      v_question_id,
      'jamb',
      v_subject,
      v_year,
      'objective',
      v_payload->>'question',
      v_options,
      NULL,
      NULL,
      coalesce(v_payload->>'difficulty', 'medium'),
      nullif(v_payload->>'topic', ''),
      v_item.item_number,
      nullif(v_payload->>'image_url', ''),
      coalesce(v_payload->'image_urls', '[]'::jsonb),
      nullif(v_payload->>'image_position', ''),
      false,
      'published',
      p_batch_id,
      nullif(v_payload->>'source_reference', ''),
      coalesce(nullif(v_payload->>'source_document', ''), v_batch.source_document),
      nullif(v_payload->>'source_page', '')::INTEGER,
      nullif(v_payload->>'source_question_number', ''),
      nullif(v_payload->>'content_hash', ''),
      p_actor,
      now()
    );

    IF v_answer_verified THEN
      INSERT INTO public.study_question_answer_keys (
        question_id, correct_answer, explanation, review_status,
        source_ref, reviewed_by, reviewed_at
      ) VALUES (
        v_question_id,
        v_answer,
        nullif(v_payload->>'explanation', ''),
        'approved',
        nullif(v_payload->>'source_reference', ''),
        p_actor,
        now()
      );
    ELSE
      v_ungraded := v_ungraded + 1;
    END IF;

    UPDATE public.question_import_items
    SET status = 'published',
        published_question_id = v_question_id,
        reviewed_by = p_actor,
        reviewed_at = coalesce(reviewed_at, now()),
        updated_at = now()
    WHERE id = v_item.id;

    v_published := v_published + 1;
  END LOOP;

  IF v_published = 0 THEN
    RAISE EXCEPTION 'There are no approved items in this batch';
  END IF;

  UPDATE public.question_import_batches
  SET status = 'published',
      published_count = v_published,
      approved_count = (
        SELECT count(*) FROM public.question_import_items
        WHERE batch_id = p_batch_id AND status = 'published'
      ),
      approved_by = p_actor,
      approved_at = now(),
      published_at = now(),
      updated_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'batch_id', p_batch_id,
    'status', 'published',
    'published_count', v_published,
    'ungraded_count', v_ungraded,
    'idempotent_replay', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.publish_jamb_question_batch(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_jamb_question_batch(UUID, UUID)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 7. RLS and grants
-- ---------------------------------------------------------------------------
ALTER TABLE public.exam_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_program_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_import_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_syllabus_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_user_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.question_import_batches,
  public.question_import_items,
  public.study_question_answer_keys,
  public.exam_configurations,
  public.exam_syllabus_versions,
  public.exam_syllabus_topics,
  public.exam_attempts,
  public.exam_attempt_questions,
  public.exam_attempt_answers
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public.question_import_batches,
  public.question_import_items,
  public.study_question_answer_keys,
  public.exam_configurations,
  public.exam_syllabus_versions,
  public.exam_syllabus_topics,
  public.exam_attempts,
  public.exam_attempt_questions,
  public.exam_attempt_answers
TO service_role;

DROP POLICY IF EXISTS exam_programs_read_authenticated ON public.exam_programs;
CREATE POLICY exam_programs_read_authenticated
  ON public.exam_programs FOR SELECT TO authenticated
  USING (is_active IS TRUE AND public.current_auth_session_is_active());

DROP POLICY IF EXISTS exam_program_subjects_read_authenticated ON public.exam_program_subjects;
CREATE POLICY exam_program_subjects_read_authenticated
  ON public.exam_program_subjects FOR SELECT TO authenticated
  USING (
    public.current_auth_session_is_active()
    AND EXISTS (
      SELECT 1 FROM public.exam_programs p
      WHERE p.id = exam_program_id AND p.is_active IS TRUE
    )
  );

GRANT SELECT ON TABLE public.exam_programs, public.exam_program_subjects TO authenticated;

DROP POLICY IF EXISTS exam_user_bookmarks_owner_all ON public.exam_user_bookmarks;
CREATE POLICY exam_user_bookmarks_owner_all
  ON public.exam_user_bookmarks FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.current_auth_session_is_active()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.current_auth_session_is_active()
    AND EXISTS (
      SELECT 1 FROM public.study_questions q
      WHERE q.id = public.exam_user_bookmarks.question_id
        AND q.exam_program_id = public.exam_user_bookmarks.exam_program_id
        AND q.hidden IS FALSE
        AND q.review_status = 'published'
    )
  );

DROP POLICY IF EXISTS exam_user_progress_owner_all ON public.exam_user_progress;
CREATE POLICY exam_user_progress_owner_all
  ON public.exam_user_progress FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.current_auth_session_is_active()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.current_auth_session_is_active()
    AND EXISTS (
      SELECT 1 FROM public.study_questions q
      WHERE q.id = public.exam_user_progress.question_id
        AND q.exam_program_id = public.exam_user_progress.exam_program_id
        AND q.hidden IS FALSE
        AND q.review_status = 'published'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.exam_user_bookmarks,
  public.exam_user_progress
TO authenticated;

-- Update the existing student question SELECT policy without weakening
-- session/entitlement checks. Admins can inspect staged/hidden material;
-- students can read only published visible rows from their selected programme.
DROP POLICY IF EXISTS study_questions_select_policy ON public.study_questions;
CREATE POLICY study_questions_select_policy
ON public.study_questions
FOR SELECT
TO authenticated
USING (
  public.current_auth_session_is_active()
  AND EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.user_id = (SELECT auth.uid())
      AND (
        p.is_admin IS TRUE
        OR (
          public.study_questions.hidden IS FALSE
          AND public.study_questions.review_status = 'published'
          AND (
            p.trial_expires_at > statement_timestamp()
            OR p.subscription_expires_at > statement_timestamp()
          )
        )
      )
  )
);


-- Keep the existing direct admin editor JUPEB-only. JAMB content must pass
-- private-source staging, source-rights confirmation, human review and publish.
DROP POLICY IF EXISTS study_questions_insert_policy ON public.study_questions;
CREATE POLICY study_questions_insert_policy
  ON public.study_questions FOR INSERT TO public
  WITH CHECK (
    coalesce(exam_program_id, 'jupeb') = 'jupeb'
    AND auth.uid() IN (SELECT p.user_id FROM public.profiles p WHERE p.is_admin IS TRUE)
  );

DROP POLICY IF EXISTS study_questions_update_policy ON public.study_questions;
CREATE POLICY study_questions_update_policy
  ON public.study_questions FOR UPDATE TO authenticated
  USING (
    exam_program_id = 'jupeb'
    AND auth.uid() IN (SELECT p.user_id FROM public.profiles p WHERE p.is_admin IS TRUE)
  )
  WITH CHECK (
    exam_program_id = 'jupeb'
    AND auth.uid() IN (SELECT p.user_id FROM public.profiles p WHERE p.is_admin IS TRUE)
  );

DROP POLICY IF EXISTS study_questions_delete_policy ON public.study_questions;
CREATE POLICY study_questions_delete_policy
  ON public.study_questions FOR DELETE TO public
  USING (
    exam_program_id = 'jupeb'
    AND auth.uid() IN (SELECT p.user_id FROM public.profiles p WHERE p.is_admin IS TRUE)
  );

-- ---------------------------------------------------------------------------
-- 8. Private original-source storage
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-source-documents',
  'question-source-documents',
  false,
  31457280,
  ARRAY[
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage question source documents" ON storage.objects;
CREATE POLICY "Admins manage question source documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'question-source-documents'
  AND public.current_auth_session_is_active()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  )
)
WITH CHECK (
  bucket_id = 'question-source-documents'
  AND public.current_auth_session_is_active()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  )
);

NOTIFY pgrst, 'reload schema';

COMMIT;
