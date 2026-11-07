-- Restore the deployed admin-only question hide RPC that is recorded in
-- Supabase migration history but was missing from the repository's clean-install
-- migration sequence. The RPC hides a question; it does not delete score/history.
CREATE OR REPLACE FUNCTION public.admin_delete_question(p_question_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT COALESCE(p.is_admin, false)
    INTO caller_is_admin
  FROM public.profiles AS p
  WHERE p.user_id = auth.uid();

  IF NOT COALESCE(caller_is_admin, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can delete questions'
    );
  END IF;

  UPDATE public.study_questions
  SET hidden = true
  WHERE id = p_question_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Question not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_question(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(text) TO authenticated, service_role;
