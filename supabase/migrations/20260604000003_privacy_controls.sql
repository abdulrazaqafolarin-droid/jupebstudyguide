-- Add privacy settings columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_last_seen TEXT NOT NULL DEFAULT 'everyone'
    CHECK (privacy_last_seen IN ('everyone', 'friends', 'nobody')),
  ADD COLUMN IF NOT EXISTS privacy_read_receipts TEXT NOT NULL DEFAULT 'everyone'
    CHECK (privacy_read_receipts IN ('everyone', 'friends', 'nobody')),
  ADD COLUMN IF NOT EXISTS privacy_activity_status TEXT NOT NULL DEFAULT 'everyone'
    CHECK (privacy_activity_status IN ('everyone', 'friends', 'nobody'));

-- User reports table (for abuse/spam reporting)
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'harassment', 'inappropriate', 'fake_account', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(reporter_id, reported_user_id)
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports"
  ON public.user_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read their own reports"
  ON public.user_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- View-once / screenshot-detect tracking
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS view_once BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS screenshot_attempts INTEGER NOT NULL DEFAULT 0;

-- RPC to report a user
CREATE OR REPLACE FUNCTION public.report_user(
  p_reported_user_id UUID,
  p_reason TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_report_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reported_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot report yourself';
  END IF;

  INSERT INTO public.user_reports (reporter_id, reported_user_id, reason, description)
  VALUES (auth.uid(), p_reported_user_id, p_reason, p_description)
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- RPC to check if user can see last_seen
CREATE OR REPLACE FUNCTION public.can_view_last_seen(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_relationship TEXT;
BEGIN
  SELECT privacy_last_seen INTO v_privacy FROM public.profiles WHERE id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  -- friends only
  SELECT get_relationship_status(p_target_user_id, auth.uid()) INTO v_relationship;
  RETURN v_relationship = 'accepted';
END;
$$;

-- RPC to check if user can see read receipts
CREATE OR REPLACE FUNCTION public.can_view_read_receipts(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_relationship TEXT;
BEGIN
  SELECT privacy_read_receipts INTO v_privacy FROM public.profiles WHERE id = p_target_user_id;
  IF v_privacy = 'everyone' THEN RETURN TRUE; END IF;
  IF v_privacy = 'nobody' THEN RETURN FALSE; END IF;
  SELECT get_relationship_status(p_target_user_id, auth.uid()) INTO v_relationship;
  RETURN v_relationship = 'accepted';
END;
$$;

-- Respect last_seen privacy in presence context
CREATE OR REPLACE FUNCTION public.get_last_seen(p_target_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_privacy TEXT;
  v_last_seen TIMESTAMPTZ;
BEGIN
  SELECT privacy_last_seen, last_seen_at INTO v_privacy, v_last_seen
  FROM public.profiles WHERE id = p_target_user_id;

  IF v_privacy = 'everyone' THEN RETURN v_last_seen; END IF;
  IF v_privacy = 'nobody' THEN RETURN NULL; END IF;
  -- friends only
  IF public.get_relationship_status(p_target_user_id, auth.uid()) = 'accepted' THEN
    RETURN v_last_seen;
  END IF;
  RETURN NULL;
END;
$$;
