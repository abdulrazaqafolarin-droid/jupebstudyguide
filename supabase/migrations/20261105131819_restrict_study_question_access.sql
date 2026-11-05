-- Restrict the past-question API to authenticated accounts with a valid
-- entitlement. The question bank remains in Supabase and is still served
-- through the existing app query; this does not create an offline/export path.
--
-- Active five-day trials are permitted. Activated accounts and trusted admins
-- retain access. Expired trials and accounts without an entitlement are denied.
-- Hidden questions remain admin-only.

DROP POLICY IF EXISTS study_questions_select_policy ON public.study_questions;

CREATE POLICY study_questions_select_policy
ON public.study_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = (SELECT auth.uid())
      AND (
        p.is_admin IS TRUE
        OR (
          (
            p.is_activated IS TRUE
            OR p.trial_expires_at > statement_timestamp()
          )
          AND public.study_questions.hidden IS FALSE
        )
      )
  )
);

COMMENT ON POLICY study_questions_select_policy ON public.study_questions IS
  'Allows active trials and activated accounts to read visible questions; admins can also read hidden questions.';

-- Do not leave anonymous SELECT rights in place behind an RLS-only barrier.
REVOKE SELECT ON TABLE public.study_questions FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.study_questions TO authenticated, service_role;

-- Vector rows are not needed by student clients: they retrieve matches through
-- the guarded SECURITY DEFINER RPC below. Keep direct table maintenance admin-only.
DROP POLICY IF EXISTS study_question_embeddings_select_all
  ON public.study_question_embeddings;
DROP POLICY IF EXISTS study_question_embeddings_select_admin
  ON public.study_question_embeddings;

CREATE POLICY study_question_embeddings_select_admin
ON public.study_question_embeddings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = (SELECT auth.uid())
      AND p.is_admin IS TRUE
  )
);

REVOKE ALL ON TABLE public.study_question_embeddings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.study_question_embeddings TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.study_question_embeddings TO service_role;

NOTIFY pgrst, 'reload schema';


-- Student AI retrieval runs only inside the authenticated Edge Functions,
-- which call this RPC with the Supabase service-role key after validating
-- the student's session and trial/activation entitlement. Keep this function
-- SECURITY INVOKER and restrict EXECUTE to service_role; it must not become a
-- public or authenticated-user content-export endpoint.
CREATE OR REPLACE FUNCTION public.match_study_questions(
  query_embedding extensions.vector,
  match_threshold double precision,
  match_count integer,
  filter_subject text DEFAULT NULL
)
RETURNS TABLE(
  question_id text,
  subject text,
  year integer,
  category text,
  question text,
  options jsonb,
  correct_answer text,
  explanation text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    sq.id,
    sq.subject,
    sq.year,
    sq.category,
    sq.question,
    sq.options,
    sq.correct_answer,
    sq.explanation,
    1 - (sqe.embedding <=> query_embedding) AS similarity
  FROM public.study_question_embeddings AS sqe
  JOIN public.study_questions AS sq ON sq.id = sqe.question_id
  WHERE sq.hidden IS NOT TRUE
    AND (filter_subject IS NULL OR sq.subject = filter_subject)
    AND 1 - (sqe.embedding <=> query_embedding) > match_threshold
  ORDER BY sqe.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 10);
END;
$function$;

REVOKE ALL ON FUNCTION public.match_study_questions(
  extensions.vector, double precision, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_study_questions(
  extensions.vector, double precision, integer, text
) TO service_role;

NOTIFY pgrst, 'reload schema';
