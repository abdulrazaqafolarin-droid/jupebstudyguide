-- Require admins for both the existing and resulting question row on upsert.
DROP POLICY IF EXISTS study_questions_update_policy ON public.study_questions;

CREATE POLICY study_questions_update_policy
  ON public.study_questions
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IN (
      SELECT p.user_id
      FROM public.profiles AS p
      WHERE p.is_admin IS TRUE
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT p.user_id
      FROM public.profiles AS p
      WHERE p.is_admin IS TRUE
    )
  );
