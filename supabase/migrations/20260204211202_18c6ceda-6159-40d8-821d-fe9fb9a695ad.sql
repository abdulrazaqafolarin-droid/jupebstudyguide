-- Drop existing permissive RLS policies
DROP POLICY IF EXISTS "Anyone can create custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can delete custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can update custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can view custom questions" ON public.custom_questions;

-- Create secure RLS policies that restrict access to question owners only

-- Users can only view their own questions
CREATE POLICY "Users can view own questions"
ON public.custom_questions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only create questions under their own account
CREATE POLICY "Users can create own questions"
ON public.custom_questions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own questions
CREATE POLICY "Users can update own questions"
ON public.custom_questions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can only delete their own questions
CREATE POLICY "Users can delete own questions"
ON public.custom_questions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);