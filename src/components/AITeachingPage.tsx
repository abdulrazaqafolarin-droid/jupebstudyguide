import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import MathRenderer from './MathRenderer';
import { useAttachment } from '@/hooks/useAttachment';
import { DailyTask, SyllabusTopic } from '@/types/syllabus';
import { SUBJECT_INFO } from '@/types/question';
import { 
  Bot, Send, ArrowLeft, Loader2, BookOpen,
  GraduationCap, CheckCircle, Plus, Image, FileText, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { streamChat } from '@/lib/ai-service';
import { TUTOR_SYSTEM_PROMPT, SYLLABUS_TEACHING_PROMPT } from '@/lib/prompts';
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

export const AITeachingPage = ({ task, topic, onBack, onComplete }: AITeachingPageProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { attachment, isProcessing, addAttachment, clearAttachment } = useAttachment();

  const subjectInfo = SUBJECT_INFO[task.subject];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

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

    const systemPrompt = TUTOR_SYSTEM_PROMPT + "\n\n" + SYLLABUS_TEACHING_PROMPT + syllabusContext;

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
    const initialPrompt = `I want to learn about \"${topic.name}\" step by step. This is Day ${task.day} of my JUPEB syllabus study plan.

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
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', `subject-${task.subject}`)}>
                {subjectInfo.icon} Day {task.day}
              </span>
            </div>

            <Button
              onClick={onComplete}
              size="sm"
              variant="outline"
              className="gap-2 text-accent border-accent/50 hover:bg-accent/10"
            >
              <CheckCircle className="w-4 h-4" />
              Done
            </Button>
          </div>
        </div>
      </header>

      {/* Topic Info Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{topic.name}</h1>
              <p className="text-sm text-muted-foreground">{topic.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-3 sm:px-4 w-full overflow-x-hidden [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden">
        <div className="max-w-4xl mx-auto py-6 space-y-6 w-full min-w-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2 sm:gap-4 w-full min-w-0",
                msg.role === 'user' && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'assistant' ? "bg-primary/20" : "bg-secondary"
              )}>
                {msg.role === 'assistant' ? (
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                ) : (
                  <span className="text-xs sm:text-sm font-medium">You</span>
                )}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 sm:px-5 sm:py-4 min-w-0 flex-1 max-w-[85%]",
                  msg.role === 'assistant'
                    ? "bg-card border border-border shadow-sm"
                    : "bg-primary text-primary-foreground"
                )}
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                    <MathRenderer content={msg.content} className="leading-relaxed" />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Attachment preview */}
      {attachment && (
        <div className="bg-background border-t border-border">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-2">
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
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 bg-background border-t border-border">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-end">
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
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
                "bg-primary/10 hover:bg-primary/20 text-primary transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Attach file"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
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
              placeholder={attachment ? "Describe what you need help with..." : "Ask a question, request clarification, or say 'I understand, continue'..."}
              className="min-h-[52px] max-h-[150px] resize-none text-base flex-1"
              rows={1}
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="lg"
              disabled={(!input.trim() && !attachment) || isLoading}
              className="shrink-0 px-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Attach images or documents for AI analysis • The tutor will teach step-by-step
          </p>
        </form>
      </div>
    </div>
  );
};

export default AITeachingPage;

