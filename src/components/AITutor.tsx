import { useState, useRef, useEffect, useCallback } from 'react';
import { Question } from '@/types/question';
import { Textarea } from './ui/textarea';
import MathRenderer from './MathRenderer';
import { useAttachment } from '@/hooks/useAttachment';
import { 
  Bot, Send, Sparkles, X, Lightbulb, HelpCircle,
  BookOpen, Loader2, Plus, Image, FileText, Copy, Pencil, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { streamChat } from '@/lib/ai-service';
import type { QuestionRef } from '@/lib/ai-service';
import QuestionRefChips from './QuestionRefChips';
import { TUTOR_SYSTEM_PROMPT } from '@/lib/prompts';
import { getSyllabusContext } from '@/lib/syllabus-context';
import { searchRelevantChunks } from '@/lib/rag';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: { base64: string; mimeType: string; name: string };
  questionRefs?: QuestionRef[];
}

interface AITutorProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  { icon: HelpCircle, text: "Explain step by step", prompt: "Please explain this question step by step in a way I'll never forget." },
  { icon: Lightbulb, text: "Memory trick", prompt: "Give me a clever mnemonic or memory trick to remember this concept forever." },
  { icon: BookOpen, text: "Why is this the answer?", prompt: "Explain why the correct answer is right and why the other options are wrong." },
  { icon: Sparkles, text: "Real-world example", prompt: "Give me a real-world example that makes this concept crystal clear and memorable." },
];

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

const messageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

const springMessage = { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.5 };

export const AITutor = ({ question, isOpen, onClose }: AITutorProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assistantContentRef = useRef('');
  const prevQuestionId = useRef(question.id);
  
  const { attachment, isProcessing, addAttachment, clearAttachment } = useAttachment();

  useEffect(() => {
    if (isOpen && scrollRef.current && isAtBottom) {
      const el = scrollRef.current;
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [messages, isOpen, isAtBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (prevQuestionId.current !== question.id) {
      setMessages([]);
      setInput('');
      prevQuestionId.current = question.id;
    }
  }, [question.id]);

  const askTutor = useCallback(async (userMessage: string) => {
    const userMsg: Message = { 
      role: 'user', 
      content: userMessage,
      ...(attachment ? { attachment: { base64: attachment.base64, mimeType: attachment.mimeType, name: attachment.name } } : {}),
    };
    
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);
    setInput('');
    clearAttachment();
    assistantContentRef.current = '';

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const questionContext = `\n\n--- Current Question Being Studied ---\nSubject: ${question.subject}\nTopic: ${question.topic}\nQuestion: ${question.question}\n${question.options ? `Options: ${JSON.stringify(question.options)}` : ''}\nCorrect Answer: ${question.correctAnswer}\nExplanation: ${question.explanation}`;
    const systemPrompt = TUTOR_SYSTEM_PROMPT + questionContext + getSyllabusContext();

    let ragContext = "";
    try {
      ragContext = await searchRelevantChunks(userMessage);
    } catch (e) { console.warn("RAG unavailable, continuing without it:", e); }

    await streamChat(systemPrompt, allMessages, {
      onDelta: (text) => {
        assistantContentRef.current += text;
        const content = assistantContentRef.current;
        setMessages(prev => {
          const arr = [...prev];
          if (arr.length > 0 && arr[arr.length - 1].role === 'assistant') {
            arr[arr.length - 1] = { role: 'assistant', content, questionRefs: arr[arr.length - 1].questionRefs };
          }
          return arr;
        });
      },
      onQuestionReferences: (refs) => {
        setMessages(prev => {
          const arr = [...prev];
          if (arr.length > 0 && arr[arr.length - 1].role === 'assistant') {
            arr[arr.length - 1] = { ...arr[arr.length - 1], questionRefs: refs };
          }
          return arr;
        });
      },
      onDone: () => {
        setIsLoading(false);
      },
      onError: (err) => {
        toast.error(err);
        setIsLoading(false);
      },
    }, ragContext, question.subject);
  }, [question, attachment, clearAttachment, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    askTutor(input.trim() || (attachment ? `[Attached: ${attachment.name}]` : ''));
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    askTutor(prompt);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addAttachment(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.8 }}
          className="w-full max-w-2xl h-[80vh] bg-card/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/30 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-primary/[0.08] via-accent/[0.06] to-transparent shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">AI Tutor</h3>
                <p className="text-[11px] text-muted-foreground/80">Your personal study companion</p>
              </div>
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

          {/* Messages Area */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold mb-1.5 text-foreground">Ask me anything!</h4>
                    <p className="text-xs text-muted-foreground/80 mb-4 max-w-xs mx-auto leading-relaxed">
                      I'll explain this question step-by-step. You can also attach images or documents.
                    </p>
                    <motion.div
                      initial="initial"
                      animate="animate"
                      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
                      className="grid grid-cols-2 gap-1.5 w-full max-w-sm mx-auto"
                    >
                      {QUICK_PROMPTS.map((item, i) => (
                        <motion.button
                          key={i}
                          variants={{
                            initial: { opacity: 0, y: 8 },
                            animate: { opacity: 1, y: 0 }
                          }}
                          whileHover={{ scale: 1.03, borderColor: "hsla(38, 92%, 50%, 0.4)" }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleQuickPrompt(item.prompt)}
                          disabled={isLoading}
                          className={cn(
                            "flex items-center gap-1.5 p-2 rounded-lg",
                            "border border-white/10 bg-white/[0.03]",
                            "text-left text-xs transition-colors",
                            "hover:bg-primary/[0.06]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <item.icon className="w-3 h-3 text-primary shrink-0" />
                          <span className="line-clamp-1">{item.text}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  className="space-y-3 w-full"
                  initial="initial"
                  animate="animate"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {messages.map((msg, i) => (
                      <motion.div
                        key={`msg-${i}`}
                        layout
                        variants={messageVariants}
                        initial="initial"
                        animate="animate"
                        transition={springMessage}
                        className={cn(
                          "flex gap-2 w-full",
                          msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/20 mt-1">
                            <Bot className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "rounded-xl px-3 py-2 min-w-0",
                            "max-w-[85%]",
                            msg.role === 'assistant'
                              ? "bg-white/[0.06] border border-white/5 text-foreground"
                              : "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm shadow-primary/20"
                          )}
                          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {msg.attachment && (
                            <div className="flex items-center gap-1 mb-1 text-[10px] opacity-75">
                              {msg.attachment.mimeType.startsWith('image/') ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                              <span className="truncate">{msg.attachment.name}</span>
                            </div>
                          )}
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                              <MathRenderer content={msg.content} className="text-xs leading-relaxed" />
                            </div>
                          ) : (
                            <p className="text-xs whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                          )}
                          {msg.role === 'assistant' && msg.questionRefs && msg.questionRefs.length > 0 && (
                            <QuestionRefChips refs={msg.questionRefs} />
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/20 mt-1">
                            <span className="text-[10px] font-medium text-primary">You</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isLoading && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/20">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                      <div className="bg-white/[0.06] border border-white/5 rounded-xl px-3 py-2.5">
                        <TypingDots />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Scroll to bottom */}
            <AnimatePresence>
              {!isAtBottom && messages.length > 3 && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={() => {
                    const el = scrollRef.current;
                    if (el) el.scrollTop = el.scrollHeight;
                  }}
                  className="absolute bottom-24 right-6 w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-md hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Attachment preview */}
          {attachment && (
            <div className="shrink-0 border-t border-white/5 bg-white/[0.02] px-3 py-1.5 flex items-center gap-2">
              {attachment.preview ? (
                <img src={attachment.preview} alt="" className="w-8 h-8 rounded object-cover" loading="lazy" />
              ) : (
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary/70" />
                </div>
              )}
              <span className="text-xs truncate flex-1 text-muted-foreground">{attachment.name}</span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={clearAttachment}
                className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </motion.button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/5 bg-background/30 px-3 py-2.5">
            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isProcessing}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  "bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
                title="Attach file"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </motion.button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={attachment ? "Describe what you need..." : "Ask me to explain, give examples..."}
                className="min-h-[40px] max-h-[80px] resize-none text-sm flex-1 bg-white/5 border-white/10 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 rounded-xl placeholder:text-muted-foreground/50"
                rows={1}
                disabled={isLoading}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={(!input.trim() && !attachment) || isLoading}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  "bg-primary text-primary-foreground shadow-sm shadow-primary/30",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
