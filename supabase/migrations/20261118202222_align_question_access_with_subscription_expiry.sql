-- Supersedes the earlier access-policy experiment in
-- 20261118200840_restore_activated_jupeb_question_access.sql.
-- Activation codes are time-limited (7/30/90 days): is_activated is a
-- historical flag, not a permanent entitlement. Keep the RLS policy aligned
-- with the app gate: active session plus admin, active trial, or active
-- subscription. A visible, published question remains the only student row
-- exposed through this policy.

DROP POLICY IF EXISTS study_questions_select_policy ON public.study_questions;

CREATE POLICY study_questions_select_policy
ON public.study_questions
FOR SELECT
TO authenticated
USING (
  (SELECT public.current_auth_session_is_active())
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = (SELECT auth.uid())
      AND (
        p.is_admin IS TRUE
        OR (
          public.study_questions.hidden IS FALSE
          AND public.study_questions.review_status = 'published'
          AND (
            p.trial_expires_at > statement_timestamp()
            OR p.subscription_expires_at > statement_timestamp()
          )
        )
      )
  )
);

COMMENT ON POLICY study_questions_select_policy ON public.study_questions IS
  'Requires an active device session and an admin role or unexpired trial/subscription to read published visible questions.';
