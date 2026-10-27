-- Study Chat: topic-scoped AI threads.
-- ai_chats gains syllabus linkage so a chat started from a syllabus
-- topic/subtopic can be found again (find-or-create) and rendered with
-- its topic chip in the history sidebar. RLS is unchanged: every policy
-- on ai_chats already scopes to auth.uid() = user_id, and the new
-- columns carry no user data beyond a syllabus id.

ALTER TABLE public.ai_chats ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.ai_chats ADD COLUMN IF NOT EXISTS topic_id text;
ALTER TABLE public.ai_chats ADD COLUMN IF NOT EXISTS subtopic text;

-- Find-or-create: "newest chat for this topic" runs per user.
CREATE INDEX IF NOT EXISTS idx_ai_chats_topic
  ON public.ai_chats(user_id, topic_id);
