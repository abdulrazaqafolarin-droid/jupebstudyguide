-- Answer images + AI marking storage
-- Requires bucket "answer-images" created via Supabase dashboard or API

CREATE TABLE IF NOT EXISTS answer_images (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  subject text NOT NULL,
  year integer,
  image_url text NOT NULL,
  answer_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answer_markings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  subject text NOT NULL,
  answer_text text,
  image_url text,
  score integer CHECK (score >= 0 AND score <= 100),
  feedback text,
  strengths text,
  weaknesses text,
  corrections text,
  marked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE answer_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_markings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own answer images"
  ON answer_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own answer images"
  ON answer_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own answer images"
  ON answer_images FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own markings"
  ON answer_markings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own markings"
  ON answer_markings FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_answer_images_user ON answer_images(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_images_question ON answer_images(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_markings_user ON answer_markings(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_markings_question ON answer_markings(question_id);
