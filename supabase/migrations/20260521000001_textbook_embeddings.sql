CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.textbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT,
  level TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.textbook_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id UUID NOT NULL REFERENCES public.textbooks(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX textbook_chunks_textbook_id_idx ON public.textbook_chunks(textbook_id);
CREATE INDEX textbook_chunks_embedding_idx ON public.textbook_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

ALTER TABLE public.textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbook_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "textbooks_select_all" ON public.textbooks FOR SELECT USING (true);
CREATE POLICY "textbooks_insert_admin" ON public.textbooks FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
);

CREATE POLICY "textbook_chunks_select_all" ON public.textbook_chunks FOR SELECT USING (true);
CREATE POLICY "textbook_chunks_insert_admin" ON public.textbook_chunks FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
);

CREATE OR REPLACE FUNCTION public.match_textbook_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  textbook_id UUID,
  textbook_title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.textbook_id,
    t.title,
    tc.content,
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM public.textbook_chunks tc
  JOIN public.textbooks t ON t.id = tc.textbook_id
  WHERE 1 - (tc.embedding <=> query_embedding) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
