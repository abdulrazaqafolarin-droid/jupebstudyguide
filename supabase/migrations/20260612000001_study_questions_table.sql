CREATE TABLE IF NOT EXISTS public.study_questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('objective', 'theory', 'practical')),
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  course TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.study_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_questions_select_policy" ON public.study_questions
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_study_questions_subject_year ON public.study_questions(subject, year);
CREATE INDEX IF NOT EXISTS idx_study_questions_category ON public.study_questions(category);
