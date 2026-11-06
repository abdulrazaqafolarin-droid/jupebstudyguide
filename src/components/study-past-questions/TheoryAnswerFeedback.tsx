import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, X, RefreshCw, ChevronDown, Loader2, Check, Send, User, ImagePlus, Copy, Pencil, Square } from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { streamChat, type AIChatMessage } from '@/lib/ai-service';
import { TUTOR_SYSTEM_PROMPT } from '@/lib/prompts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { StudyQuestion } from '@/types/study-questions';

export interface EvalData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  corrections: string;
}

interface TheoryAnswerFeedbackProps {
  question: StudyQuestion;
  userAnswer: string;
  imageAttachments?: { base64: string; mimeType: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onComplete?: (data: EvalData, content: string) => void;
  /** If provided, renders in read-only mode with this content instead of streaming */
  initialContent?: string;
  initialEvalData?: EvalData;
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

function parseScoreBlock(fullText: string): { display: string; data: EvalData | null } {
  // Flexible match: allow optional whitespace/newlines around the JSON block
  const match = fullText.match(/---SCORE---\s*\n?([\s\S]*?)\n?\s*---END SCORE---/);
  if (!match) {
    // Fallback: try to find {"score": N, ...} pattern anywhere in text
    const jsonFallback = fullText.match(/\{(?:\s*)"score":\s*(\d+)/);
    if (jsonFallback) {
      try {
        // Find the complete JSON object starting from the match position
        const start = jsonFallback.index;
        let depth = 0;
        let end = start;
        for (let i = start; i < fullText.length; i++) {
          if (fullText[i] === '{') depth++;
          if (fullText[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        const jsonStr = fullText.slice(start, end);
        const parsed = JSON.parse(jsonStr);
        const display = fullText.slice(0, start) + fullText.slice(end);
        return {
          display,
          data: {
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            corrections: parsed.corrections || '',
          },
        };
      } catch { /* Malformed fallback JSON — fall through to raw display */ }
    }
    return { display: fullText, data: null };
  }

  const display = fullText.replace(/---SCORE---\s*\n?[\s\S]*?\n?\s*---END SCORE---/, '').trim();
  try {
    const parsed = JSON.parse(match[1]);
    return {
      display,
      data: {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        corrections: parsed.corrections || '',
      },
    };
  } catch {
    return { display, data: null };
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10';
  if (score >= 60) return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10';
}

export function TheoryAnswerFeedback({
  question, userAnswer, imageAttachments, isOpen, onClose, onRetry, onComplete,
  initialContent, initialEvalData,
}: TheoryAnswerFeedbackProps) {
  const [content, setContent] = useState(initialContent ?? '');
  const [evalData, setEvalData] = useState<EvalData | null>(initialEvalData ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluationAnswer, setEvaluationAnswer] = useState(userAnswer);
  const [isEditingEvaluationAnswer, setIsEditingEvaluationAnswer] = useState(false);
  const [evaluationDraft, setEvaluationDraft] = useState(userAnswer);
  const [evaluationInterrupted, setEvaluationInterrupted] = useState(false);
  const [editingChatIndex, setEditingChatIndex] = useState<number | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const contentRef = useRef(initialContent ?? '');
  const evalRef = useRef<EvalData | null>(initialEvalData ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const completedRef = useRef(false);
  const evaluationAbortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const evaluationAnswerRef = useRef(userAnswer);
  evaluationAnswerRef.current = evaluationAnswer;
  const isReadOnly = initialContent !== undefined;
  // Keep the latest question in a ref so parent re-renders (e.g. the inline
  // spread used for practical sub-questions) can't restart a running evaluation.
  const questionRef = useRef(question);
  questionRef.current = question;

  // Chat follow-up state
  type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    attachments?: { base64: string; mimeType: string; name: string }[];
    historyStart?: number;
    historyCount?: number;
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<{ base64: string; mimeType: string; name: string }[]>([]);
  const chatSystemRef = useRef('');
  const chatHistoryRef = useRef<AIChatMessage[]>([]);
  const chatMsgIndexRef = useRef(0);
  const chatFileRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleChatAttach = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const clamped = Array.from(files).slice(0, 3 - chatAttachments.length);
    for (const file of clamped) {
      const base64 = await fileToBase64(file);
      setChatAttachments(prev => [...prev, { base64, mimeType: file.type, name: file.name }]);
    }
    e.target.value = '';
  }, [chatAttachments.length]);

  const removeChatAttachment = useCallback((index: number) => {
    setChatAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 60;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [chatMessages]);

  const startEvaluation = useCallback(async () => {
    if (hasStarted.current || isReadOnly) return;
    hasStarted.current = true;
    completedRef.current = false;
    setIsLoading(true);
    setEvaluationInterrupted(false);
    setContent('');
    setEvalData(null);
    evalRef.current = null;
    contentRef.current = '';
    const ac = new AbortController();
    evaluationAbortRef.current = ac;

    try {
    const q = questionRef.current;
    const questionText = q.question || (q.title ? `${q.title}\n${q.objective || ''}` : '') || '';
    const expectedAnswer = (q.correctAnswer && q.correctAnswer !== 'TBD' ? q.correctAnswer : null)
      || q.answerGuide
      || '';
    const subQuestions = q.category === 'practical' && q.subQuestions
      ? '\nSub-questions:\n' + q.subQuestions.map((sq, i) => `${i + 1}. ${sq.text}`).join('\n')
      : '';

    const questionContext = `\n\n--- QUESTION ---\nSubject: ${typeof q.subject === 'string' ? q.subject : ''}\nTopic: ${q.topic || ''}\n\nQuestion:\n${questionText}${subQuestions}\n\n${q.explanation ? `Notes: ${q.explanation}\n` : ''}\nExpected Answer / Marking Scheme:\n${expectedAnswer}\n${q.answerGuide ? `\nAnswer Guide:\n${q.answerGuide}` : ''}`;

    const systemPrompt = TUTOR_SYSTEM_PROMPT + `\n\n## Marking Task\nYou are now marking this student's answer to the JUPEB question below. Give clear feedback on what they did right/wrong and show the correct approach. Be encouraging but honest. At the very end of your final answer, append a JSON score block:\n\n---SCORE---\n{"score": <0-100>, "strengths": ["..."], "weaknesses": ["..."], "corrections": "..."}\n---END SCORE---\n\nScore rubric: Content Accuracy 40%, Reasoning 30%, Completeness 20%, Presentation 10%.\n` + questionContext;

    chatSystemRef.current = systemPrompt;

    const msgs: {role: 'user' | 'assistant', content: string, attachment?: { base64: string; mimeType: string; name: string }}[] = [];

    // First message: the student's text answer
    const imageCount = imageAttachments?.length || 0;
    let attachNote = '';
    if (imageCount > 0) {
      attachNote = `\n\n[The student also submitted ${imageCount} image${imageCount > 1 ? 's' : ''} of their written work — each is attached as a separate message below]`;
    }
    msgs.push({
      role: 'user',
      content: `Student's answer: ${evaluationAnswerRef.current}${attachNote}`,
    });

    // Additional messages: each image as a separate user message
    if (imageAttachments) {
      for (let i = 0; i < imageAttachments.length; i++) {
        const att = imageAttachments[i];
        msgs.push({
          role: 'user',
          content: `[Image ${i + 1} of ${imageAttachments.length} — student's work]`,
          attachment: att,
        });
      }
    }

    let fullText = '';
    await streamChat(systemPrompt, msgs, {
      onDelta: (text) => {
        fullText += text;
        const { display } = parseScoreBlock(fullText);
        contentRef.current = display;
        setContent(display);
      },
      onDone: () => {
        if (evaluationAbortRef.current === ac) evaluationAbortRef.current = null;
        const { display, data } = parseScoreBlock(fullText);
        const clean = display;
        contentRef.current = clean;
        setContent(clean);
        evalRef.current = data;
        if (data) setEvalData(data);
        setIsLoading(false);
        setEvaluationInterrupted(!data);
        if (!data) hasStarted.current = false;
        // Keep every message (text answer + image attachments) so the AI still
        // sees the student's written work during the follow-up chat.
        chatHistoryRef.current = [
          ...msgs,
          { role: 'assistant', content: clean },
        ];
        // Show initial image attachments as visible user messages
        if (imageAttachments && imageAttachments.length > 0) {
          const initialImageMsgs: ChatMessage[] = imageAttachments.map((att, i) => ({
            role: 'user',
            content: imageAttachments.length > 1 ? `[Submitted image ${i + 1} of ${imageAttachments.length}]` : '[Submitted image]',
            attachments: [{ base64: att.base64, mimeType: att.mimeType, name: att.name }],
          }));
          setChatMessages(initialImageMsgs);
          // The image bubbles occupy the first slots of the chat list — advance
          // the index so the first follow-up reply lands on its own bubble
          // instead of overwriting the student's question.
          chatMsgIndexRef.current = initialImageMsgs.length;
        }
      },
      onError: (err) => {
        if (evaluationAbortRef.current === ac) evaluationAbortRef.current = null;
        hasStarted.current = false;
        setEvaluationInterrupted(true);
        contentRef.current += `\n\n*AI Error: ${err}*`;
        setContent(contentRef.current);
        setIsLoading(false);
      },
    }, undefined, undefined, ac.signal);
    } catch (err) {
      if (evaluationAbortRef.current === ac) evaluationAbortRef.current = null;
      hasStarted.current = false;
      setEvaluationInterrupted(true);
      contentRef.current += `\n\n*Error: ${err instanceof Error ? err.message : String(err)}*`;
      setContent(contentRef.current);
      setIsLoading(false);
    }
  }, [imageAttachments, isReadOnly]);

  useEffect(() => {
    if (isReadOnly) {
      setIsLoading(false);
      return;
    }
    if (isOpen) {
      evaluationAnswerRef.current = userAnswer;
      setEvaluationAnswer(userAnswer);
      setEvaluationDraft(userAnswer);
      setIsEditingEvaluationAnswer(false);
      setEvaluationInterrupted(false);
      setEditingChatIndex(null);
      evaluationAbortRef.current?.abort();
      chatAbortRef.current?.abort();
      contentRef.current = '';
      setContent('');
      setEvalData(null);
      evalRef.current = null;
      hasStarted.current = false;
      completedRef.current = false;
      setChatMessages([]);
      setChatInput('');
      setChatAttachments([]);
      chatHistoryRef.current = [];
      chatMsgIndexRef.current = 0;
      setIsLoading(true);
      const timer = setTimeout(() => startEvaluation(), 300);
      return () => {
        clearTimeout(timer);
        evaluationAbortRef.current?.abort();
        chatAbortRef.current?.abort();
        evaluationAbortRef.current = null;
        chatAbortRef.current = null;
      };
    }
  }, [isOpen, startEvaluation, isReadOnly, userAnswer]);

  const handleDone = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.(
      evalRef.current || { score: 0, strengths: [], weaknesses: [], corrections: '' },
      contentRef.current,
    );
  }, [onComplete]);

  const copyMessage = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy message');
    }
  }, []);

  const stopEvaluation = useCallback(() => {
    const controller = evaluationAbortRef.current;
    if (!controller) return;
    hasStarted.current = false;
    evaluationAbortRef.current = null;
    controller.abort();
    setIsLoading(false);
    setEvaluationInterrupted(true);
  }, []);

  const stopFollowupChat = useCallback(() => {
    const controller = chatAbortRef.current;
    if (!controller) return;
    chatAbortRef.current = null;
    controller.abort();
    setIsChatLoading(false);
    setEditingChatIndex(null);
  }, []);

  const handleEditEvaluationAnswer = useCallback(() => {
    setEvaluationDraft(evaluationAnswer);
    setIsEditingEvaluationAnswer(true);
  }, [evaluationAnswer]);

  const handleSaveEvaluationAnswer = useCallback(() => {
    const nextAnswer = evaluationDraft.trim();
    if (!nextAnswer || isLoading) return;
    evaluationAnswerRef.current = nextAnswer;
    setEvaluationAnswer(nextAnswer);
    setIsEditingEvaluationAnswer(false);
    setEvaluationInterrupted(false);
    setContent('');
    setEvalData(null);
    contentRef.current = '';
    evalRef.current = null;
    setChatMessages([]);
    setChatInput('');
    setChatAttachments([]);
    setEditingChatIndex(null);
    chatHistoryRef.current = [];
    chatMsgIndexRef.current = 0;
    hasStarted.current = false;
    completedRef.current = false;
    void startEvaluation();
  }, [evaluationDraft, isLoading, startEvaluation]);

  const handleEditChatMessage = useCallback((index: number) => {
    if (isChatLoading) return;
    const message = chatMessages[index];
    if (message?.role !== 'user' || message.historyStart === undefined) return;
    setEditingChatIndex(index);
    setChatInput(message.content);
  }, [chatMessages, isChatLoading]);

  const handleChatSubmit = useCallback(async () => {
    const text = chatInput.trim();
    if ((!text && chatAttachments.length === 0) || isChatLoading) return;
    setChatInput('');

    const snapAttachments = [...chatAttachments];
    setChatAttachments([]);

    const editTarget = editingChatIndex !== null ? chatMessages[editingChatIndex] : undefined;
    const historyStart = editTarget?.historyStart ?? chatHistoryRef.current.length;
    const previousSegment = editTarget
      ? chatHistoryRef.current.slice(historyStart, historyStart + (editTarget.historyCount ?? 1))
      : [];
    const preservedAttachments = previousSegment
      .slice(1)
      .filter((message) => message.attachment)
      .map((message) => message.attachment!)
      .filter((attachment) => !!attachment.base64);
    const attachmentsToSend = snapAttachments.length > 0 ? snapAttachments : preservedAttachments;

    // For API: send each image as a separate message (edge function limitation).
    const imgMsgs: AIChatMessage[] = attachmentsToSend.map((att, i) => ({
      role: 'user',
      content: `[Follow-up image ${i + 1} of ${attachmentsToSend.length}]`,
      attachment: att,
    }));

    const userText = text || '[Image(s) attached]';
    const userMsg: AIChatMessage = { role: 'user', content: userText };
    const allNewMsgs: AIChatMessage[] = [userMsg, ...imgMsgs];
    const baseHistory = chatHistoryRef.current.slice(0, historyStart);
    const updatedHistory = [...baseHistory, ...allNewMsgs];
    chatHistoryRef.current = updatedHistory;

    const baseDisplay = editingChatIndex !== null
      ? chatMessages.slice(0, editingChatIndex)
      : chatMessages;
    const displayUserMsg: ChatMessage = {
      role: 'user',
      content: userText,
      historyStart,
      historyCount: allNewMsgs.length,
    };
    const displayImgMsgs: ChatMessage[] = attachmentsToSend.map((att, i) => ({
      role: 'user',
      content: attachmentsToSend.length > 1 ? `[Image ${i + 1} of ${attachmentsToSend.length}]` : '[Image]',
      attachments: [{ base64: att.base64, mimeType: att.mimeType, name: att.name }],
      historyStart: historyStart + i + 1,
      historyCount: 1,
    }));
    const assistantDisplayIndex = baseDisplay.length + 1 + displayImgMsgs.length;
    setChatMessages([
      ...baseDisplay,
      displayUserMsg,
      ...displayImgMsgs,
      { role: 'assistant', content: '' },
    ]);
    setEditingChatIndex(null);
    setIsChatLoading(true);

    let botText = '';
    const systemMsg = chatSystemRef.current;
    const ac = new AbortController();
    chatAbortRef.current = ac;

    const updateChatDisplay = (responseText: string) => {
      setChatMessages((prev) => {
        const next = [...prev];
        if (assistantDisplayIndex < next.length) {
          next[assistantDisplayIndex] = { role: 'assistant', content: responseText };
        }
        return next;
      });
    };

    await streamChat(systemMsg, updatedHistory, {
      onDelta: (delta) => {
        botText += delta;
        updateChatDisplay(botText);
      },
      onDone: () => {
        if (chatAbortRef.current === ac) chatAbortRef.current = null;
        setIsChatLoading(false);
        chatHistoryRef.current = [
          ...updatedHistory,
          { role: 'assistant', content: botText },
        ];
        chatMsgIndexRef.current = assistantDisplayIndex + 1;
        if (!botText) {
          setChatMessages((prev) => prev.filter((_, index) => index !== assistantDisplayIndex));
        }
      },
      onError: (err) => {
        if (chatAbortRef.current === ac) chatAbortRef.current = null;
        setIsChatLoading(false);
        updateChatDisplay(`*AI Error: ${err}*`);
      },
    }, undefined, undefined, ac.signal);
  }, [chatInput, chatAttachments, isChatLoading, editingChatIndex, chatMessages]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
        className="rounded-2xl border bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/[0.08] via-accent/[0.06] to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                AI Evaluation
              </h3>
              <p className="text-[10px] text-muted-foreground/70">
                {isLoading ? 'Evaluating your answer...' : 'Feedback ready'}
              </p>
            </div>
            {evalData && !isLoading && (
              <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border", getScoreColor(evalData.score))}>
                {evalData.score}/100
              </span>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto max-h-[60vh] min-h-[120px] p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-3"
          >
            {/* Student's original answer — editable and re-evaluable. */}
            <div className="group rounded-xl border border-primary/10 bg-primary/[0.04] px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your submitted answer</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void copyMessage(evaluationAnswer)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    title="Copy your answer"
                    aria-label="Copy your answer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  {!isReadOnly && !isLoading && !isEditingEvaluationAnswer && (
                    <button
                      type="button"
                      onClick={handleEditEvaluationAnswer}
                      className="rounded p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      title="Edit answer and evaluate again"
                      aria-label="Edit submitted answer"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              {isEditingEvaluationAnswer ? (
                <div className="space-y-2">
                  <textarea
                    value={evaluationDraft}
                    onChange={(event) => setEvaluationDraft(event.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-lg border border-border bg-background/80 p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    aria-label="Edit submitted theory answer"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingEvaluationAnswer(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEvaluationAnswer}
                      disabled={!evaluationDraft.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Re-evaluate answer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                  <MathRenderer content={evaluationAnswer || '(No text answer submitted)'} className="text-xs leading-relaxed" />
                </div>
              )}
            </div>

            {/* Initial evaluation */}
            {content ? (
              <div className="group relative rounded-xl px-3 py-2 bg-white/[0.06] border border-white/5">
                <div className="absolute right-1 top-1 flex items-center rounded-md border border-white/10 bg-background/90 px-1 py-0.5 opacity-100 shadow-sm backdrop-blur-md sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => void copyMessage(content)}
                    className="rounded p-1 hover:bg-white/10"
                    title="Copy evaluation"
                    aria-label="Copy evaluation"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
                <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere] prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-headings:my-1">
                  <MathRenderer content={content} className="text-xs leading-relaxed" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-xs text-muted-foreground/60">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
    <TypingDots />
                </div>
              </div>
            )}

            {/* Follow-up chat messages */}
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("group flex flex-col gap-1", msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-1.5 px-1">
                  {msg.role === 'user' ? (
                    <>
                      <span className="text-[10px] font-medium text-foreground/50">You</span>
                      <User className="w-3 h-3 text-foreground/40" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-primary/70" />
                      <span className="text-[10px] font-medium text-primary/60">AI</span>
                    </>
                  )}
                </div>
                <div className={cn(
                  "relative max-w-[90%] rounded-xl px-3 py-2",
                  msg.role === 'user'
                    ? 'bg-primary/15 border border-primary/10'
                    : 'bg-white/[0.06] border border-white/5',
                  editingChatIndex === i && 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background'
                )}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map((att, j) => {
                        if (att.mimeType?.startsWith('image/')) {
                          return (
                            <img
                              key={j}
                              src={`data:${att.mimeType};base64,${att.base64}`}
                              alt={att.name}
                              className="max-w-[180px] max-h-[180px] rounded-lg border border-white/10 object-cover"
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere] prose-p:my-0.5 prose-li:my-0 prose-ul:my-0.5">
                    {msg.content ? (
                      <MathRenderer content={msg.content} className="text-xs leading-relaxed" />
                    ) : msg.role === 'assistant' ? (
                      <TypingDots />
                    ) : null}
                  </div>
                  {msg.content && (
                    <div className="absolute -top-2 right-1 flex items-center gap-0.5 rounded-md border border-white/10 bg-background/90 px-1 py-0.5 opacity-100 shadow-sm backdrop-blur-md sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => void copyMessage(msg.content)}
                        className="rounded p-1 hover:bg-white/10"
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {msg.role === 'user' && msg.historyStart !== undefined && !isChatLoading && (
                        <button
                          type="button"
                          onClick={() => handleEditChatMessage(i)}
                          className="rounded p-1 hover:bg-white/10"
                          title="Edit message and rewind this chat"
                          aria-label="Edit chat message"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Scroll to bottom */}
          <AnimatePresence>
            {!isAtBottom && content && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTop = el.scrollHeight;
                }}
                className="absolute bottom-2 right-4 w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-md hover:bg-white/20 transition-colors z-10"
              >
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — unified bar: chat input + action buttons */}
        <div className="border-t border-border/50">
          {/* Chat input & actions */}
          {!isLoading && !isReadOnly && (
            <div className="px-3 py-2 bg-muted/10 space-y-2">
              {editingChatIndex !== null && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                  <Pencil className="h-3 w-3 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Editing message — later replies will be removed when you send</span>
                  <button
                    type="button"
                    onClick={() => { setEditingChatIndex(null); setChatInput(''); }}
                    className="rounded p-1 hover:bg-white/10"
                    title="Cancel edit"
                    aria-label="Cancel edit"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {chatAttachments.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {chatAttachments.map((att, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] text-primary">
                      <ImagePlus className="w-2.5 h-2.5" />
                      {att.name.length > 16 ? att.name.slice(0, 14) + '..' : att.name}
                      <button onClick={() => removeChatAttachment(i)} className="hover:text-destructive ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={chatFileRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleChatAttach}
                />
                <button
                  type="button"
                  onClick={() => chatFileRef.current?.click()}
                  disabled={chatAttachments.length >= 3}
                  className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 flex-shrink-0"
                  title="Attach image"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  disabled={isChatLoading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-40"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={isChatLoading ? stopFollowupChat : () => void handleChatSubmit()}
                  disabled={!isChatLoading && (!chatInput.trim() && chatAttachments.length === 0)}
                  title={isChatLoading ? "Stop response" : "Send message"}
                  aria-label={isChatLoading ? "Stop response" : "Send message"}
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-40",
                    isChatLoading ? "bg-foreground text-background hover:opacity-90" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {isChatLoading ? <Square className="h-3 w-3" fill="currentColor" /> : <Send className="h-3.5 w-3.5" />}
                </motion.button>
              </div>
            </div>
          )}
          {/* Action buttons */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
              <Bot className="w-3 h-3" />
              Powered by AI
            </span>
            <div className="flex items-center gap-2">
              {isLoading && !isReadOnly && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={stopEvaluation}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  title="Stop evaluation"
                  aria-label="Stop evaluation"
                >
                  <Square className="h-3 w-3" fill="currentColor" />
                  Stop
                </motion.button>
              )}
              {evaluationInterrupted && !isLoading && !isReadOnly && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void startEvaluation()}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry evaluation
                </motion.button>
              )}
              {isReadOnly ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-accent transition-colors"
                >
                  <X className="w-3 h-3" />
                  Close
                </motion.button>
              ) : (
                <>
                  {!isLoading && onRetry && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onRetry}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-accent transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try Again
                    </motion.button>
                  )}
                  {!isLoading && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDone}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Done
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
