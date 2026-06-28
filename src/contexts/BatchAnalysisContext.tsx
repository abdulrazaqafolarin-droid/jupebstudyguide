import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import type { Subject } from '@/types/question';
import type { StudyCategory } from '@/types/study-questions';
import { getStudyQuestionsBySubject, refreshData } from '@/data/study-questions';
import { updateQuestion } from '@/lib/admin-questions-service';
import type { QuestionInput } from '@/lib/admin-questions-service';
import { analyzeQuestionWithAI } from '@/lib/ai-question-analyzer';
import { processMathText } from '@/lib/process-math';

export interface QueueItem {
  id: string;
  subject: Subject;
  year: number;
  category: StudyCategory;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  current: number;
  total: number;
  success: number;
  failed: number;
  error?: string;
}

interface BatchAnalysisContextValue {
  queue: QueueItem[];
  isProcessing: boolean;
  isMinimized: boolean;
  hasActiveItems: boolean;
  addToQueue: (subject: Subject, year: number, category: StudyCategory) => void;
  removeFromQueue: (id: string) => void;
  clearCompleted: () => void;
  toggleMinimized: () => void;
  cancelAll: () => void;
}

const BatchAnalysisContext = createContext<BatchAnalysisContextValue | null>(null);

export function BatchAnalysisProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const processingRef = useRef(false);
  const cancelledRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  queueRef.current = queue;

  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    cancelledRef.current = false;

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 3000];

    while (true) {
      const current = queueRef.current;
      const nextIdx = current.findIndex(i => i.status === 'queued');
      if (nextIdx === -1 || cancelledRef.current) break;

      const item = current[nextIdx];
      setQueue(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'processing' as const } : i
      ));

      const questions = getStudyQuestionsBySubject(item.subject, item.year, item.category);
      const total = questions.length;
      let success = 0, failed = 0;

      for (let i = 0; i < total; i++) {
        if (cancelledRef.current) break;

        if (i > 0) {
          await new Promise(r => setTimeout(r, 500));
        }

        const q = questions[i];
        setQueue(prev => prev.map(qi =>
          qi.id === item.id
            ? { ...qi, current: i + 1, total, success, failed }
            : qi
        ));

        if (!q.question?.trim()) { failed++; continue; }

        let lastError: unknown;
        let succeeded = false;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          if (cancelledRef.current) break;
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
          }

          try {
            const katexQuestion = processMathText(q.question);
            let katexOptions: { label: string; text: string }[] | null = null;
            if (q.category === "objective" && q.options?.length) {
              katexOptions = q.options.map(o => ({ label: o.label, text: processMathText(o.text) }));
            }

            const result = await analyzeQuestionWithAI(
              katexQuestion,
              katexOptions || q.options,
              q.correctAnswer || null,
              q.topic || null,
              q.category,
            );

            if (!result.explanation || result.explanation.trim().length < 20 || result.explanation.startsWith("AI analysis failed") || result.explanation.startsWith("Unable to generate")) {
              throw new Error(result.explanation || "Empty explanation from AI");
            }

            const explanation = result.explanation && !/^\s*[{[]/.test(result.explanation)
              ? result.explanation
              : undefined;

            const updateData: QuestionInput = {
              id: q.id,
              subject: item.subject,
              year: item.year,
              category: q.category,
              question: katexQuestion,
              options: katexOptions || q.options,
              correctAnswer: result.correctAnswer || q.correctAnswer || undefined,
              topic: result.topic || q.topic || undefined,
              explanation,
              difficulty: q.difficulty || "medium",
              sortOrder: q.sortOrder ?? i,
              imageUrl: q.imageUrl || undefined,
              imagePosition: q.imagePosition || undefined,
            };

            const saveResult = await updateQuestion(updateData);
            if (saveResult.success) { succeeded = true; break; }
            else { lastError = saveResult.error || 'Save failed'; }
          } catch (err) {
            lastError = err;
          }
        }

        if (succeeded) success++;
        else {
          failed++;
          setQueue(prev => prev.map(qi =>
            qi.id === item.id
              ? { ...qi, error: lastError instanceof Error ? lastError.message : String(lastError) }
              : qi
          ));
        }
      }

      setQueue(prev => prev.map(qi =>
        qi.id === item.id
          ? {
              ...qi,
              status: cancelledRef.current ? 'failed' as const : 'completed' as const,
              success: cancelledRef.current ? qi.success : success,
              failed: cancelledRef.current ? qi.failed + (total - qi.current) : failed,
              current: total,
              total,
              error: cancelledRef.current ? 'Cancelled' : undefined,
            }
          : qi
      ));
    }

    await new Promise(r => setTimeout(r, 500));
    await refreshData();
    processingRef.current = false;
  }, []);

  const addToQueue = useCallback((subject: Subject, year: number, category: StudyCategory) => {
    setQueue(prev => {
      const exists = prev.some(i =>
        i.subject === subject && i.year === year && i.category === category
        && (i.status === 'queued' || i.status === 'processing')
      );
      if (exists) return prev;

      const id = `${subject}-${year}-${category}-${Date.now()}`;
      const questions = getStudyQuestionsBySubject(subject, year, category);
      return [...prev, { id, subject, year, category, status: 'queued' as const, current: 0, total: questions.length, success: 0, failed: 0 }];
    });

    Promise.resolve().then(() => processNext());
  }, [processNext]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(i => i.status === 'queued' || i.status === 'processing'));
  }, []);

  const cancelAll = useCallback(() => {
    cancelledRef.current = true;
    processingRef.current = false;
  }, []);

  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const isProcessing = queue.some(i => i.status === 'processing');
  const hasActiveItems = queue.some(i => i.status === 'queued' || i.status === 'processing');

  return (
    <BatchAnalysisContext.Provider value={{
      queue, isProcessing, isMinimized, hasActiveItems,
      addToQueue, removeFromQueue, clearCompleted, toggleMinimized, cancelAll,
    }}>
      {children}
    </BatchAnalysisContext.Provider>
  );
}

export function useBatchAnalysis() {
  const ctx = useContext(BatchAnalysisContext);
  if (!ctx) throw new Error('useBatchAnalysis must be used within BatchAnalysisProvider');
  return ctx;
}
