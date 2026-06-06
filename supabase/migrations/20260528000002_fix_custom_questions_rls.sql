-- Fix custom_questions RLS: replace permissive (anyone) policies with user-scoped policies
-- Previous policies allowed ANYONE (even unauthenticated) to read/write/delete all rows

DROP POLICY IF EXISTS "Anyone can view custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can create custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can update custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can delete custom questions" ON public.custom_questions;

CREATE POLICY "Users can view own custom questions"
  ON public.custom_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom questions"
  ON public.custom_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom questions"
  ON public.custom_questions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom questions"
  ON public.custom_questions FOR DELETE
  USING (auth.uid() = user_id);

-- user_id must be set on insert; previous schema allowed NULL
ALTER TABLE public.custom_questions ALTER COLUMN user_id SET NOT NULL;
