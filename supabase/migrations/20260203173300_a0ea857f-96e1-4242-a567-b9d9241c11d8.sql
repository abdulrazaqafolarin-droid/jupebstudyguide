-- Create storage bucket for uploaded documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Create policy for authenticated users to upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for users to view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for custom questions from uploaded documents
CREATE TABLE public.custom_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  document_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  year INTEGER,
  topic TEXT,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for custom questions - allowing public access for anonymous users
CREATE POLICY "Anyone can view custom questions"
ON public.custom_questions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create custom questions"
ON public.custom_questions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update custom questions"
ON public.custom_questions
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete custom questions"
ON public.custom_questions
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_custom_questions_updated_at
BEFORE UPDATE ON public.custom_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();