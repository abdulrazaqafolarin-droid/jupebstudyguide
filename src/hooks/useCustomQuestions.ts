import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Question, Subject, MCQOption } from '@/types/question';

export function useCustomQuestions() {
  const { user } = useAuth();
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!user) {
      setCustomQuestions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('custom_questions')
        .select('id, subject, year, question_type, topic, question, options, correct_answer, explanation, difficulty, document_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const questions: Question[] = (data || []).map((row) => ({
        id: row.id,
        subject: row.subject as Subject,
        year: row.year || new Date().getFullYear(),
        type: row.question_type as 'mcq' | 'essay',
        topic: row.topic || undefined,
        question: row.question,
        options: Array.isArray(row.options) ? (row.options as unknown as MCQOption[]) : undefined,
        correctAnswer: row.correct_answer,
        explanation: row.explanation,
        difficulty: (row.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        document_name: row.document_name || undefined,
      }));

      setCustomQuestions(questions);
    } catch (err) {
      console.error('Error fetching custom questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteQuestion = useCallback(async (questionId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('custom_questions')
        .delete()
        .eq('id', questionId);

      if (deleteError) throw deleteError;

      setCustomQuestions(prev => prev.filter(q => q.id !== questionId));
      return true;
    } catch (err) {
      console.error('Error deleting question:', err);
      return false;
    }
  }, []);

  const getQuestionsBySubject = useCallback((subject: Subject) => {
    return customQuestions.filter(q => q.subject === subject);
  }, [customQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    customQuestions,
    isLoading,
    error,
    refetch: fetchQuestions,
    deleteQuestion,
    getQuestionsBySubject,
  };
}
