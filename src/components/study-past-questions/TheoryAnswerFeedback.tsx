import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, X, RefreshCw, ChevronDown, Loader2, Check, Send, User, ImagePlus } from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { streamChat, type AIChatMessage } from '@/lib/ai-service';
import { TUTOR_SYSTEM_PROMPT } from '@/lib/prompts';
import { cn } from '@/lib/utils';
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
      } catch {}
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

  const [isAtBottom, setIsAtBottom] = useState(true);
  const contentRef = useRef(initialContent ?? '');
  const evalRef = useRef<EvalData | null>(initialEvalData ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const completedRef = useRef(false);
  const isReadOnly = initialContent !== undefined;

  // Chat follow-up state
  type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    attachments?: { base64: string; mimeType: string; name: string }[];
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
    contentRef.current = '';

    try {
    const questionText = question.question || (question.title ? `${question.title}\n${question.objective || ''}` : '') || '';
    const expectedAnswer = (question.correctAnswer && question.correctAnswer !== 'TBD' ? question.correctAnswer : null)
      || question.answerGuide
      || '';
    const subQuestions = question.category === 'practical' && question.subQuestions
      ? '\nSub-questions:\n' + question.subQuestions.map((sq, i) => `${i + 1}. ${sq.text}`).join('\n')
      : '';

    const questionContext = `\n\n--- QUESTION ---\nSubject: ${typeof question.subject === 'string' ? question.subject : ''}\nTopic: ${question.topic || ''}\n\nQuestion:\n${questionText}${subQuestions}\n\n${question.explanation ? `Notes: ${question.explanation}\n` : ''}\nExpected Answer / Marking Scheme:\n${expectedAnswer}\n${question.answerGuide ? `\nAnswer Guide:\n${question.answerGuide}` : ''}`;

    const systemPrompt = TUTOR_SYSTEM_PROMPT + `\n\n## Marking Task\nYou are now marking this student's answer to the JUPEB question below. Give clear feedback on what they did right/wrong and show the correct approach. Be encouraging but honest. At the very end of your final answer, append a JSON score block:\n\n---SCORE---\n{"score": <0-100>, "strengths": ["..."], "weaknesses": ["..."], "corrections": "..."}\n---END SCORE---\n\nScore rubric: Content Accuracy 40%, Reasoning 30%, Completeness 20%, Presentation 10%.\n` + questionContext;

    chatSystemRef.current = systemPrompt;

    const msgs: {role: 'user' | 'assistant', content: string, attachment?: { base64: string; mimeType: string; name: string }}[] = [];

    // First message: the student's text answer
    let imageCount = imageAttachments?.length || 0;
    let attachNote = '';
    if (imageCount > 0) {
      attachNote = `\n\n[The student also submitted ${imageCount} image${imageCount > 1 ? 's' : ''} of their written work — each is attached as a separate message below]`;
    }
    msgs.push({
      role: 'user',
      content: `Student's answer: ${userAnswer}${attachNote}`,
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

    const initialUserMsg = msgs[0];

    let fullText = '';
    await streamChat(systemPrompt, msgs, {
      onDelta: (text) => {
        fullText += text;
        const { display } = parseScoreBlock(fullText);
        contentRef.current = display;
        setContent(display);
      },
      onDone: () => {
        const { display, data } = parseScoreBlock(fullText);
        const clean = display;
        contentRef.current = clean;
        setContent(clean);
        evalRef.current = data;
        if (data) setEvalData(data);
        setIsLoading(false);
        chatHistoryRef.current = [
          initialUserMsg,
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
        }
      },
      onError: (err) => {
        contentRef.current += `\n\n*AI Error: ${err}*`;
        setContent(contentRef.current);
        setIsLoading(false);
      },
    });
    } catch (err) {
      contentRef.current += `\n\n*Error: ${err instanceof Error ? err.message : String(err)}*`;
      setContent(contentRef.current);
      setIsLoading(false);
    }
  }, [question, userAnswer, imageAttachments, isReadOnly]);

  useEffect(() => {
    if (isReadOnly) {
      setIsLoading(false);
      return;
    }
    if (isOpen) {
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
      return () => clearTimeout(timer);
    }
  }, [isOpen, startEvaluation, isReadOnly]);

  const handleDone = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.(
      evalRef.current || { score: 0, strengths: [], weaknesses: [], corrections: '' },
      contentRef.current,
    );
  }, [onComplete]);

  const handleChatSubmit = useCallback(async () => {
    const text = chatInput.trim();
    if ((!text && chatAttachments.length === 0) || isChatLoading) return;
    setChatInput('');

    const snapAttachments = [...chatAttachments];
    setChatAttachments([]);

    // For API: send each image as a separate message (edge function limitation)
    const imgMsgs: AIChatMessage[] = snapAttachments.map((att, i) => ({
      role: 'user',
      content: `[Follow-up image ${i + 1} of ${snapAttachments.length}]`,
      attachment: att,
    }));

    const userText = text || '[Image(s) attached]';
    const userMsg: AIChatMessage = { role: 'user', content: userText };
    const allNewMsgs: AIChatMessage[] = [userMsg, ...imgMsgs];
    const updatedHistory = [...chatHistoryRef.current, ...allNewMsgs] as AIChatMessage[];
    chatHistoryRef.current = updatedHistory;

    const aiIndex = chatMsgIndexRef.current;
    chatMsgIndexRef.current += allNewMsgs.length + 1;

    // For display: keep separate entries per image so updateChatDisplay index stays correct
    const displayUserMsg: ChatMessage = { role: 'user', content: userText };
    const displayImgMsgs: ChatMessage[] = snapAttachments.map((att, i) => ({
      role: 'user',
      content: snapAttachments.length > 1 ? `[Image ${i + 1} of ${snapAttachments.length}]` : '[Image]',
      attachments: [{ base64: att.base64, mimeType: att.mimeType, name: att.name }],
    }));
    setChatMessages(prev => [...prev, displayUserMsg, ...displayImgMsgs, { role: 'assistant', content: '' }]);
    setIsChatLoading(true);

    let botText = '';
    const systemMsg = chatSystemRef.current;
    const apiMessages = updatedHistory;

    const updateChatDisplay = (text: string) => {
      setChatMessages(prev => {
        const arr = [...prev];
        arr[aiIndex + allNewMsgs.length] = {
          role: 'assistant',
          content: text,
        };
        return arr;
      });
    };

    await streamChat(systemMsg, apiMessages, {
      onDelta: (delta) => {
        botText += delta;
        updateChatDisplay(botText);
      },
      onDone: () => {
        setIsChatLoading(false);
        chatHistoryRef.current = [
          ...updatedHistory,
          { role: 'assistant', content: botText },
        ] as AIChatMessage[];
      },
      onError: () => {
        setIsChatLoading(false);
      },
    });
  }, [chatInput, chatAttachments, isChatLoading]);

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
            {/* Initial evaluation */}
            {content ? (
              <div className="rounded-xl px-3 py-2 bg-white/[0.06] border border-white/5">
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
              <div key={i} className={cn("flex flex-col gap-1", msg.role === 'user' ? 'items-end' : 'items-start')}>
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
                  "max-w-[90%] rounded-xl px-3 py-2",
                  msg.role === 'user'
                    ? 'bg-primary/15 border border-primary/10'
                    : 'bg-white/[0.06] border border-white/5'
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
                  {msg.role === 'assistant' && (
                    <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere] prose-p:my-0.5 prose-li:my-0 prose-ul:my-0.5">
                      {msg.content ? (
                        <MathRenderer content={msg.content} className="text-xs leading-relaxed" />
                      ) : (
                        <TypingDots />
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleChatSubmit}
                  disabled={(!chatInput.trim() && chatAttachments.length === 0) || isChatLoading}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all flex-shrink-0"
                >
                  {isChatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
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
