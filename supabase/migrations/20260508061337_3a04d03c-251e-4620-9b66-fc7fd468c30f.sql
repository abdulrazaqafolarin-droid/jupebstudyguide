
CREATE TABLE public.ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chats_user ON public.ai_chats(user_id, updated_at DESC);

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ai_chats select" ON public.ai_chats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai_chats insert" ON public.ai_chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ai_chats update" ON public.ai_chats FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai_chats delete" ON public.ai_chats FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER ai_chats_updated_at
  BEFORE UPDATE ON public.ai_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.ai_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL DEFAULT '',
  attachment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_messages_chat ON public.ai_chat_messages(chat_id, created_at);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ai_chat_messages select" ON public.ai_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai_chat_messages insert" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ai_chat_messages update" ON public.ai_chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai_chat_messages delete" ON public.ai_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
