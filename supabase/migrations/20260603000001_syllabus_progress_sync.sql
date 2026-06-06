-- Migration: Add syllabus_progress table for cross-device sync
-- Previously, syllabus progress was localStorage-only.
-- This table stores the serialized full SyllabusProgress JSON for each user.

CREATE TABLE IF NOT EXISTS public.syllabus_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.syllabus_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own syllabus progress
CREATE POLICY "Users can read own syllabus progress"
  ON public.syllabus_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own syllabus progress
CREATE POLICY "Users can insert own syllabus progress"
  ON public.syllabus_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own syllabus progress
CREATE POLICY "Users can update own syllabus progress"
  ON public.syllabus_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own syllabus progress
CREATE POLICY "Users can delete own syllabus progress"
  ON public.syllabus_progress
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_syllabus_progress_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_syllabus_progress_updated
  BEFORE UPDATE ON public.syllabus_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_syllabus_progress_updated_at();
