CREATE POLICY "study_questions_insert_policy" ON public.study_questions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
  );

CREATE POLICY "study_questions_update_policy" ON public.study_questions
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
  );

CREATE POLICY "study_questions_delete_policy" ON public.study_questions
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
  );
