-- ADMIN DELETE QUESTION RPC
-- SECURITY DEFINER so it bypasses RLS and runs with owner privileges
-- Explicitly checks caller is admin before deleting

CREATE OR REPLACE FUNCTION public.admin_delete_question(p_question_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check caller is admin
  SELECT COALESCE(p.is_admin, false) INTO caller_is_admin
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  IF NOT caller_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can delete questions');
  END IF;

  -- Delete the question
  DELETE FROM public.study_questions WHERE id = p_question_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Question not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_question FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question TO authenticated;
