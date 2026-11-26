-- Keep persistent AI study-chat histories isolated per exam programme.
-- Existing rows are legacy JUPEB study chats and remain in the JUPEB workspace.
BEGIN;

ALTER TABLE public.ai_chats
  ADD COLUMN IF NOT EXISTS exam_program_id text NOT NULL DEFAULT 'jupeb';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_chats_exam_program_id_fkey'
  ) THEN
    ALTER TABLE public.ai_chats
      ADD CONSTRAINT ai_chats_exam_program_id_fkey
      FOREIGN KEY (exam_program_id)
      REFERENCES public.exam_programs(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ai_chats_user_program_updated_idx
  ON public.ai_chats (user_id, exam_program_id, updated_at DESC);

-- RLS policies are intentionally unchanged: ownership remains enforced by
-- auth.uid() = user_id. Programme filters in the application scope each
-- history list and every new chat row; the database constraint rejects
-- invalid programme IDs.

COMMIT;
