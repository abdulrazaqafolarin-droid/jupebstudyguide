-- Create user_presence table for persistent Realtime presence tracking
-- Columns match what useRealtimeChat.ts expects:
--   user_id, is_online, last_seen_at, typing_in, online_at, recording_vn_in

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  typing_in UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  online_at TIMESTAMPTZ,
  recording_vn_in UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read presence
CREATE POLICY "presence_select" ON public.user_presence
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can upsert their own presence
CREATE POLICY "presence_insert" ON public.user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presence_update" ON public.user_presence
  FOR UPDATE USING (auth.uid() = user_id);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.user_presence;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_presence_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presence_updated ON public.user_presence;
CREATE TRIGGER trg_presence_updated
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_presence_timestamp();
