-- Keep the live JUPEB question policy aligned with the app's activation gate.
-- A verified activation flag remains valid even when the free-trial timestamp
-- has elapsed or a time-limited subscription has ended.
-- Anonymous access remains revoked; active sessions and published/visible
-- JUPEB filtering remain enforced for student accounts.

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
          public.study_questions.exam_program_id = 'jupeb'
          AND public.study_questions.hidden IS FALSE
          AND public.study_questions.review_status = 'published'
          AND (
            p.is_activated IS TRUE
            OR p.trial_expires_at > statement_timestamp()
            OR p.subscription_expires_at > statement_timestamp()
          )
        )
      )
  )
);

COMMENT ON POLICY study_questions_select_policy ON public.study_questions IS
  'Allows active sessions for admins, activated accounts, current trials, and current subscriptions to read published visible JUPEB questions; admins retain management access.';
