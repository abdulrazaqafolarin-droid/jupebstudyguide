import { useState, useRef, useEffect, useCallback } from 'react';
import { Question } from '@/types/question';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import MathRenderer from './MathRenderer';
import { useAttachment } from '@/hooks/useAttachment';
import { 
  Bot, Send, Sparkles, X, Lightbulb, HelpCircle,
  BookOpen, Loader2, Plus, Image, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { streamChat } from '@/lib/ai-service';
import { TUTOR_SYSTEM_PROMPT } from '@/lib/prompts';
import { searchRelevantChunks } from '@/lib/rag';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: { base64: string; mimeType: string; name: string };
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

export const AITutor = ({ question, isOpen, onClose }: AITutorProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assistantContentRef = useRef('');
  const prevQuestionId = useRef(question.id);
  
  const { attachment, isProcessing, addAttachment, clearAttachment } = useAttachment();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    const systemPrompt = TUTOR_SYSTEM_PROMPT + questionContext;

    let ragContext = "";
    try {
      ragContext = await searchRelevantChunks(userMessage);
    } catch { /* RAG unavailable, continue without it */ }

    await streamChat(systemPrompt, allMessages, {
      onDelta: (text) => {
        assistantContentRef.current += text;
        const content = assistantContentRef.current;
        setMessages(prev => {
          const arr = [...prev];
          if (arr.length > 0 && arr[arr.length - 1].role === 'assistant') {
            arr[arr.length - 1] = { role: 'assistant', content };
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
    }, ragContext);
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="w-full max-w-2xl h-[80vh] bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Tutor</h3>
                <p className="text-xs text-muted-foreground">Your personal study companion</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 w-full overflow-x-hidden [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Ask me anything!</h4>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  I'll explain this question step-by-step. You can also attach images or documents.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {QUICK_PROMPTS.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border border-border",
                        "text-left text-sm transition-all",
                        "hover:bg-primary/5 hover:border-primary/30",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <item.icon className="w-4 h-4 text-primary shrink-0" />
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-full min-w-0">
                {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn("flex gap-2 sm:gap-3 max-w-full min-w-0", msg.role === 'user' && "flex-row-reverse")}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === 'assistant' ? "bg-primary/20" : "bg-secondary"
                    )}>
                      {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-primary" /> : <span className="text-sm">You</span>}
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 sm:px-4 sm:py-3 min-w-0 flex-1 max-w-[80%]",
                        msg.role === 'assistant' ? "bg-secondary/50 text-foreground" : "bg-primary text-primary-foreground"
                      )}
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {msg.attachment && (
                        <div className="flex items-center gap-1 mb-1 text-xs opacity-75">
                          {msg.attachment.mimeType.startsWith('image/') ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          <span className="truncate">{msg.attachment.name}</span>
                        </div>
                      )}
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                          <MathRenderer content={msg.content} className="leading-relaxed" />
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-secondary/50 rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Attachment preview */}
          {attachment && (
            <div className="px-4 py-2 border-t border-border bg-secondary/30 flex items-center gap-2 shrink-0">
              {attachment.preview ? (
                <img src={attachment.preview} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <FileText className="w-5 h-5 text-primary shrink-0" />
              )}
              <span className="text-sm truncate flex-1">{attachment.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clearAttachment}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background/50 shrink-0">
            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isProcessing}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  "bg-primary/10 hover:bg-primary/20 text-primary transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                title="Attach file"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
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
                className="min-h-[48px] max-h-[120px] resize-none flex-1"
                rows={1}
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                disabled={(!input.trim() && !attachment) || isLoading}
                className="shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
