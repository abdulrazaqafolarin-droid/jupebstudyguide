import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from './ui/textarea';
import MathRenderer from './MathRenderer';
import { useAttachment } from '@/hooks/useAttachment';
import { DailyTask, SyllabusTopic } from '@/types/syllabus';
import { SUBJECT_INFO } from '@/types/question';
import { 
  Bot, Send, ArrowLeft, Loader2, BookOpen,
  GraduationCap, CheckCircle, Plus, Image, FileText, X,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { streamChat } from '@/lib/ai-service';
import { TUTOR_SYSTEM_PROMPT, SYLLABUS_TEACHING_PROMPT } from '@/lib/prompts';
import { getSyllabusContext } from '@/lib/syllabus-context';
import { searchRelevantChunks } from '@/lib/rag';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: { base64: string; mimeType: string; name: string };
}

interface AITeachingPageProps {
  task: DailyTask;
  topic: SyllabusTopic;
  onBack: () => void;
  onComplete: () => void;
}

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

export const AITeachingPage = ({ task, topic, onBack, onComplete }: AITeachingPageProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { attachment, isProcessing, addAttachment, clearAttachment } = useAttachment();

  const subjectInfo = SUBJECT_INFO[task.subject];

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  useEffect(() => {
    if (scrollRef.current && isAtBottom) {
      const el = scrollRef.current;
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [messages, isAtBottom]);

  // Start teaching automatically when component mounts
  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      startTeaching();
    }
  }, []);

  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const handleStreamChat = useCallback(async (userMessage: string, isInitial = false) => {
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      attachment: attachment ? { base64: attachment.base64, mimeType: attachment.mimeType, name: attachment.name } : undefined,
    };
    
    let newMessages: Message[];
    if (isInitial) {
      newMessages = [userMsg];
      setMessages(newMessages);
    } else {
      newMessages = [...messagesRef.current, userMsg];
      setMessages(newMessages);
    }
    setIsLoading(true);
    setInput('');
    clearAttachment();

    const syllabusContext = `\n\n--- Current Teaching Session ---
Subject: ${task.subject}
Day: ${task.day} of 30
Topic: ${topic.name}
Description: ${topic.description}
Subtopics to Cover: ${topic.subtopics?.join(', ') || 'N/A'}
Difficulty Level: ${topic.difficulty}
Learning Objectives for Today:
${task.learningObjectives?.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n') || 'N/A'}

Begin teaching this topic step by step. Start with fundamentals and build up to A-level depth. Check understanding frequently.`;

    const systemPrompt = TUTOR_SYSTEM_PROMPT + "\n\n" + SYLLABUS_TEACHING_PROMPT + syllabusContext + getSyllabusContext();

    let acc = '';

    let ragContext = "";
    try {
      ragContext = await searchRelevantChunks(userMessage);
    } catch (e) { console.warn('RAG search failed:', e); }

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await streamChat(systemPrompt, newMessages, {
      onDelta: (text) => {
        acc += text;
        setMessages(prev => {
          const newArr = [...prev];
          if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
            newArr[newArr.length - 1] = { role: 'assistant', content: acc };
          }
          return newArr;
        });
      },
      onDone: () => setIsLoading(false),
      onError: (err) => {
        toast.error(err?.message ?? String(err));
        setIsLoading(false);
      },
    }, ragContext);
  }, [topic, task, attachment, clearAttachment]);

  const startTeaching = () => {
    const initialPrompt = `I want to learn about "${topic.name}" step by step. This is Day ${task.day} of my JUPEB syllabus study plan.

The topic covers: ${topic.description}

Key subtopics: ${topic.subtopics.join(', ')}

My learning objectives for today are:
${task.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Please teach me this topic thoroughly, step by step. Start from the fundamentals and build up. Make sure I understand each concept before moving to the next. Use A-level examples from past JUPEB questions where relevant. Ask me questions to check my understanding as we go.`;

    setMessages([{ role: 'user', content: initialPrompt }]);
    handleStreamChat(initialPrompt, true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    handleStreamChat(input.trim() || (attachment ? `[Attached: ${attachment.name}]` : ''));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addAttachment(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </motion.button>
            
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-muted-foreground border border-white/10">
                {subjectInfo.icon} Day {task.day}
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </motion.button>
          </div>
        </div>
      </header>

      {/* Topic Info Banner */}
      <div className="bg-gradient-to-r from-primary/[0.08] via-accent/[0.06] to-transparent border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">{topic.name}</h1>
              <p className="text-[11px] text-muted-foreground/70 truncate">{topic.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          <div className="max-w-4xl mx-auto py-4 space-y-3 w-full min-w-0">
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
          </div>
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
              className="absolute bottom-4 right-8 w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-md hover:bg-white/20 transition-colors z-10"
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

      {/* Input Area */}
      <div className="shrink-0 border-t border-white/5 bg-background/30 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-3 py-2.5">
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
              placeholder={attachment ? "Describe what you need help with..." : "Ask a question, request clarification, or say 'I understand, continue'..."}
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
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 text-center">
            Attach images or documents for AI analysis • The tutor will teach step-by-step
          </p>
        </form>
      </div>
    </div>
  );
};

export default AITeachingPage;

