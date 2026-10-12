-- ============================================================
-- Migration: Security hardening — RPC trust boundaries, RLS WITH CHECK,
-- function execute grants, leaderboard anti-forge
-- Date: 2026-10-11
--
-- Fixes findings from the production-readiness audit. Every statement is
-- idempotent (CREATE OR REPLACE / DROP IF EXISTS / conditional grants).
-- ============================================================

-- ------------------------------------------------------------
-- 1. generate_activation_codes: authenticate the CALLER, not a parameter.
-- Anyone could previously pass an admin's UUID as p_created_by.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_activation_codes(
  p_created_by UUID,
  p_count INTEGER DEFAULT 1,
  p_plan_type TEXT DEFAULT 'basic'
)
RETURNS TABLE(code TEXT, plan_type TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_is_admin BOOLEAN;
  v_code TEXT;
  v_i INTEGER;
BEGIN
  -- The caller must be an admin; the created_by record falls back to them.
  SELECT is_admin INTO v_user_is_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_user_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can generate activation codes';
  END IF;

  IF p_created_by IS NULL THEN
    p_created_by := auth.uid();
  END IF;

  FOR v_i IN 1..LEAST(GREATEST(p_count, 1), 100) LOOP
    v_code := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)
    );

    INSERT INTO public.activation_codes (code, plan_type, created_by)
    VALUES (v_code, p_plan_type, p_created_by);

    code := v_code;
    plan_type := p_plan_type;
    expires_at := NULL;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 2. get_ai_usage_summary: verify admin via profiles.is_admin +
-- auth.uid(). The old code compared the JWT email to a caller-supplied
-- email, so any user could pass their own address.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  p_admin_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'totalRequests', (SELECT COALESCE(SUM(total_requests), 0) FROM ai_api_keys),
    'totalTokens', (SELECT COALESCE(SUM(total_tokens_used), 0) FROM ai_api_keys),
    'activeKeysCount', (SELECT COUNT(*) FROM ai_api_keys WHERE is_active = true AND token_exhausted = false),
    'totalKeysCount', (SELECT COUNT(*) FROM ai_api_keys),
    'currentActiveKey', (
      SELECT json_build_object('label', label, 'priority', priority)
      FROM ai_api_keys
      WHERE is_active = true AND token_exhausted = false
      ORDER BY priority ASC
      LIMIT 1
    ),
    'byFeature', (
      SELECT COALESCE(json_agg(json_build_object(
        'feature', feature,
        'totalTokens', SUM(total_tokens),
        'totalRequests', COUNT(*)
      )), '[]'::json)
      FROM ai_usage_log
      WHERE created_at > now() - interval '30 days'
      GROUP BY feature
    ),
    'byKey', (
      SELECT COALESCE(json_agg(json_build_object(
        'keyId', k.id,
        'label', k.label,
        'totalTokens', k.total_tokens_used,
        'totalRequests', k.total_requests,
        'percentageOfLoad', CASE
          WHEN (SELECT SUM(total_requests) FROM ai_api_keys WHERE total_requests > 0) > 0
          THEN ROUND(100.0 * k.total_requests / NULLIF((SELECT SUM(total_requests) FROM ai_api_keys WHERE total_requests > 0), 0), 1)
          ELSE 0
        END
      )), '[]'::json)
      FROM ai_api_keys k
      WHERE k.total_requests > 0
      ORDER BY k.priority ASC
    ),
    'dailyUsage', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', d.date,
        'totalTokens', d.total_tokens,
        'totalRequests', d.total_requests
      ) ORDER BY d.date ASC), '[]'::json)
      FROM (
        SELECT
          DATE(created_at) AS date,
          SUM(total_tokens) AS total_tokens,
          COUNT(*) AS total_requests
        FROM ai_usage_log
        WHERE created_at > now() - interval '30 days'
        GROUP BY DATE(created_at)
      ) d
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ------------------------------------------------------------
-- 3. award_score: bind to the caller and allowlist amounts/reasons so
-- leaderboard scores cannot be forged with arbitrary user/amount.
-- service_role callers (server jobs) keep full flexibility.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_score(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  IF (auth.jwt() ->> 'role') != 'service_role' THEN
    p_user_id := auth.uid();
    IF p_amount NOT IN (5, 10, 20, 25, 50, 100) THEN
      RAISE EXCEPTION 'Invalid score amount';
    END IF;
    IF p_reason NOT IN ('answered_question', 'correct_answer', 'streak_day', 'syllabus_day', 'achievement', 'quiz_complete') THEN
      RAISE EXCEPTION 'Invalid score reason';
    END IF;
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reference_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.score_events
    WHERE reference_id = p_reference_id AND user_id = p_user_id;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'duplicate', true);
    END IF;
  END IF;

  INSERT INTO public.score_events (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  RETURN jsonb_build_object('success', true, 'duplicate', false);
END;
$$;

-- Direct score_events writes are no longer needed by clients (RPC only).
REVOKE INSERT ON public.score_events FROM anon, authenticated;

-- Badge/system rows use amount 0; keep negatives forbidden.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_events_amount_check') THEN
    ALTER TABLE public.score_events DROP CONSTRAINT score_events_amount_check;
  END IF;
END $$;
ALTER TABLE public.score_events ADD CONSTRAINT score_events_amount_check CHECK (amount >= 0);

-- ------------------------------------------------------------
-- 4. consume_activation_code: activate the CALLER, not a parameter.
-- service_role callers (edge function, already authenticated the user
-- via JWT) keep the parameter behaviour.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_activation_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.activation_codes;
  v_result JSONB;
BEGIN
  IF (auth.jwt() ->> 'role') != 'service_role' THEN
    p_user_id := auth.uid();
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND is_activated = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already activated');
  END IF;

  SELECT * INTO v_record
  FROM public.activation_codes
  WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE SKIP LOCKED;

  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired activation code');
  END IF;

  UPDATE public.activation_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE id = v_record.id;

  UPDATE public.profiles
  SET is_activated = true
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_type', v_record.plan_type,
    'code', v_record.code
  );
END;
$$;

-- ------------------------------------------------------------
-- 5. conversation_participants INSERT: users may only add THEMSELVES
-- (joining); adding others requires conversation admin rights.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add participants"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.is_admin = true
    )
  );

-- ------------------------------------------------------------
-- 6. check_message_permission: only service_role bypasses; every
-- user-sent message goes through the conversation policy check.
-- (Previously ANY non-empty message_type bypassed, allowing system
-- message spoofing by any participant.)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_message_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy TEXT;
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  SELECT messages_policy INTO v_policy
  FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_policy = 'admins' AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id = auth.uid()
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can send messages in this group';
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 7. increment_key_stats: service_role only (was PUBLIC-executable,
-- allowing usage-stat inflation).
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.increment_key_stats(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_key_stats(uuid, integer) TO service_role;

-- ------------------------------------------------------------
-- 8. Add missing WITH CHECK clauses so UPDATE cannot reassign rows
-- to another owner.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update requests they received" ON public.friend_requests;
CREATE POLICY "Users can update requests they received"
  ON public.friend_requests FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

DROP POLICY IF EXISTS "own ai_chats update" ON public.ai_chats;
CREATE POLICY "own ai_chats update"
  ON public.ai_chats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own ai_chat_messages update" ON public.ai_chat_messages;
CREATE POLICY "own ai_chat_messages update"
  ON public.ai_chat_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own stats" ON public.user_stats;
CREATE POLICY "Users update own stats"
  ON public.user_stats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
