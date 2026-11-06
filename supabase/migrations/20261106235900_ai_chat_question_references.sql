-- Persist the exact question-bank citations attached to AI tutor replies.
-- Existing messages receive an empty array; no chat text or attachment rows change.
ALTER TABLE public.ai_chat_messages
  ADD COLUMN IF NOT EXISTS question_refs JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ai_chat_messages
  DROP CONSTRAINT IF EXISTS ai_chat_messages_question_refs_is_array;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT ai_chat_messages_question_refs_is_array
  CHECK (jsonb_typeof(question_refs) = 'array');

COMMENT ON COLUMN public.ai_chat_messages.question_refs IS
  'Question-bank RAG references emitted with this assistant response; JSON array of question IDs and JUPEB subject/year/category metadata.';
