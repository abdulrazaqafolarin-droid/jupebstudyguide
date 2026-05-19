
-- Profiles table for user discovery
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_participants_conversation ON public.conversation_participants(conversation_id);

-- RLS: Users can only access conversations they're part of
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  ));

-- Participants policies
CREATE POLICY "Users can view participants of their conversations"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Users can add participants"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Update timestamps triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
