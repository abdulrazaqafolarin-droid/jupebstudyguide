import { useState, useRef, useCallback } from 'react';
import { Question, SUBJECT_INFO } from '@/types/question';
import { cn } from '@/lib/utils';
import { RotateCcw, Check, X, Lightbulb, Bot, Sparkles, ChevronDown, ImageOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { AITutor } from './AITutor';
import MathRenderer from './MathRenderer';
import { streamChat } from "@/lib/ai-service";
import type { AIChatMessage } from "@/lib/ai-service";

const AI_ANSWER_SYSTEM_PROMPT = `You are a JUPEB exam expert. Given a theory question, provide a concise, accurate model answer that would receive full marks. Keep it brief (2-4 sentences). Use LaTeX for math if applicable.`;

interface FlashcardProps {
  question: Question;
  onAnswer: (quality: number) => void;
  showControls?: boolean;
}

export const Flashcard = ({ question, onAnswer, showControls = true }: FlashcardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [aiTheoryAnswer, setAiTheoryAnswer] = useState<string | null>(null);
  const [aiTheoryLoading, setAiTheoryLoading] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const aiAccumRef = useRef("");

  const handleAIRevealAnswer = useCallback(async () => {
    if (aiTheoryLoading || !question) return;
    setAiTheoryLoading(true);
    setAiTheoryAnswer("");
    aiAccumRef.current = "";
    try {
      const messages: AIChatMessage[] = [
        { role: "user", content: `Subject: ${question.subject}\nYear: ${question.year}\nQuestion: ${question.question}\n\nProvide a model answer for this question.` }
      ];
      await streamChat(AI_ANSWER_SYSTEM_PROMPT, messages, {
        onDelta: (text) => {
          aiAccumRef.current += text;
          setAiTheoryAnswer(aiAccumRef.current);
        },
        onDone: () => {
          setAiTheoryLoading(false);
        },
        onError: () => {
          setAiTheoryAnswer("Failed to generate answer. Please try again.");
          setAiTheoryLoading(false);
        },
      });
    } catch {
      setAiTheoryAnswer("Failed to generate answer. Please try again.");
      setAiTheoryLoading(false);
    }
  }, [question, aiTheoryLoading]);

  const subjectInfo = SUBJECT_INFO[question.subject];

  const handleOptionClick = (label: string) => {
    if (selectedOption) return;
    setSelectedOption(label);
    setShowExplanation(true);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = (quality: number) => {
    onAnswer(quality);
    setIsFlipped(false);
    setSelectedOption(null);
    setShowExplanation(false);
  };

  const isCorrect = selectedOption === question.correctAnswer;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* AI Tutor Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setShowAITutor(true)}
          variant="outline"
          className="gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary hover:bg-primary/20 transition-all"
        >
          <Bot className="w-4 h-4 text-primary" />
          <span>Ask AI Tutor</span>
          <Sparkles className="w-3 h-3 text-accent" />
        </Button>
      </div>

      <div className="flashcard-container">
        <div
          className={cn(
            'flashcard relative w-full min-h-[520px] max-h-[calc(100vh-320px)] cursor-pointer',
            isFlipped && 'flipped'
          )}
          onClick={!question.options ? handleFlip : undefined}
        >
          {/* Front of card */}
          <div className="flashcard-face absolute inset-0 rounded-2xl border-2 border-border shadow-xl overflow-hidden">
            {/* Card background with subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-secondary/30" />
            <div className="absolute inset-0 chalk-texture opacity-30" />
            
            <div className="relative h-full p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <span className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium',
                  `subject-${question.subject}`
                )}>
                  {subjectInfo.icon} {subjectInfo.name}
                </span>
                <span className="text-muted-foreground text-sm">
                  {question.year} • {question.topic}
                </span>
              </div>

              {/* Question - Scrollable */}
              <div className={cn("flex-1 flex flex-col min-h-0", !question.options ? "overflow-y-auto" : "overflow-hidden")}>
                {question.imageUrl && !imageBroken ? (
                  <div className="mb-4 rounded-xl overflow-hidden border bg-muted/30 shrink-0">
                    <img src={question.imageUrl} alt="Question" className="w-full max-h-48 object-contain" loading="lazy" onError={() => setImageBroken(true)} />
                  </div>
                ) : imageBroken ? (
                  <div className="mb-4 flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed bg-muted/20 text-muted-foreground shrink-0">
                    <ImageOff className="h-8 w-8" />
                    <p className="text-xs">Image failed to load</p>
                  </div>
                ) : (
                  <div className="text-lg font-medium mb-4 leading-relaxed shrink-0">
                    <MathRenderer content={question.question} />
                  </div>
                )}

                {/* MCQ Options - Scrollable container */}
                {question.options && (
                  <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0 max-h-[280px] pr-1 scrollbar-thin">
                    {question.options.map((option, oi) => {
                      const isSelected = selectedOption === option.label;
                      const isCorrectOption = option.label === question.correctAnswer;
                      const showResult = selectedOption !== null;

                      return (
                        <button
                          key={option.label}
                          onClick={() => handleOptionClick(option.label)}
                          disabled={selectedOption !== null}
                          style={{ animationDelay: `${oi * 0.06}s` }}
                          className={cn(
                            'w-full p-3.5 rounded-xl text-left transition-all duration-300',
                            'flex items-start gap-3 border-2',
                            !showResult && 'border-border/60 bg-background/60 hover:border-primary/60 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 active:translate-y-0',
                            'active:scale-[0.99]',
                            showResult && isCorrectOption && 'border-accent bg-accent/15 shadow-lg shadow-accent/20',
                            showResult && isSelected && !isCorrectOption && 'border-destructive bg-destructive/15 shadow-lg shadow-destructive/10',
                            showResult && !isSelected && !isCorrectOption && 'border-border/30 opacity-50 scale-[0.98]',
                            'animate-in-up'
                          )}
                        >
                          <span className={cn(
                            'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm transition-all duration-200',
                            !showResult && 'bg-secondary/80 text-foreground group-hover:bg-secondary',
                            showResult && isCorrectOption && 'bg-accent text-accent-foreground scale-110',
                            showResult && isSelected && !isCorrectOption && 'bg-destructive text-destructive-foreground scale-110',
                            showResult && !isSelected && !isCorrectOption && 'bg-secondary/50 text-muted-foreground'
                          )}>
                            {showResult && isCorrectOption ? <Check className="w-4 h-4" /> : 
                             showResult && isSelected && !isCorrectOption ? <X className="w-4 h-4" /> :
                             option.label}
                          </span>
                          <span className={cn(
                            'text-sm leading-relaxed pt-1 flex-1 min-w-0 transition-opacity duration-200',
                            showResult && !isSelected && !isCorrectOption && 'opacity-60'
                          )}>
                            <MathRenderer content={option.text} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Essay question - flip hint */}
                {!question.options && (
                  <div className="mt-auto text-center text-muted-foreground py-8">
                    <p className="text-sm mb-2">Think about your answer, then click to reveal</p>
                    <RotateCcw className="w-6 h-6 mx-auto animate-pulse text-primary/60" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Back of card (for essay questions) */}
          {!question.options && (
            <div className="flashcard-face flashcard-back absolute inset-0 rounded-2xl border-2 border-accent/30 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-accent/10" />
              <div className="absolute inset-0 chalk-texture opacity-30" />
              
              <div className="relative h-full p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-accent/30 shrink-0">
                  <span className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium bg-accent/20 text-accent'
                  )}>
                    {subjectInfo.icon} Answer
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
                  {question.explanation && (
                    <div className="text-base leading-relaxed">
                      <MathRenderer content={question.explanation} />
                    </div>
                  )}

                  {aiTheoryAnswer && (
                    <div className="p-4 rounded-xl bg-card/50 border border-accent/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2">AI Model Answer</p>
                      <div className="text-base leading-relaxed">
                        <MathRenderer content={aiTheoryAnswer} />
                      </div>
                    </div>
                  )}

                  {aiTheoryLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Generating answer...</span>
                    </div>
                  )}

                  {!aiTheoryAnswer && !aiTheoryLoading && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAIRevealAnswer(); }}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>AI Reveal Answer</span>
                    </button>
                  )}

                  {aiTheoryAnswer && !aiTheoryLoading && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAIRevealAnswer(); }}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>

                <div className="mt-auto pt-4 text-center text-muted-foreground shrink-0">
                  <p className="text-sm">Click to see question again</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explanation panel for MCQs */}
      {showExplanation && question.options && (
        <div className={cn(
          'mt-6 p-5 rounded-2xl border-2 animate-scale-in',
          isCorrect ? 'bg-gradient-to-br from-accent/10 to-accent/5 border-accent/40' : 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/40'
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              isCorrect ? 'bg-accent/20' : 'bg-destructive/20'
            )}>
              {isCorrect ? (
                <div className="relative">
                  <Check className="w-6 h-6 text-accent" />
                  <span className="absolute -top-1 -right-1 text-[8px]">✨</span>
                </div>
              ) : (
                <X className="w-6 h-6 text-destructive" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                'font-bold text-lg mb-2 flex items-center gap-2',
                isCorrect ? 'text-accent' : 'text-destructive'
              )}>
                {isCorrect ? 'Perfect! ' : 'Not quite right'}
              </p>
              <div className="text-sm leading-relaxed text-foreground/90 mb-4 bg-background/50 rounded-xl p-3 border border-border/30">
                <MathRenderer content={question.explanation} />
              </div>
              <button
                onClick={() => setShowAITutor(true)}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg"
              >
                <Bot className="w-4 h-4" />
                <span>Need a deeper explanation?</span>
                <Sparkles className="w-3 h-3 text-accent" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating controls */}
      {showControls && (selectedOption || isFlipped) && (
        <div className="mt-6 animate-in-up">
          <p className="text-center text-sm text-muted-foreground mb-4">
            How well did you know this?
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => handleRating(1)}
              className="px-4 py-2.5 rounded-xl bg-destructive/15 hover:bg-destructive/25 text-destructive transition-all duration-200 text-sm font-medium border border-destructive/20 hover:border-destructive/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Didn't know
            </button>
            <button
              onClick={() => handleRating(3)}
              className="px-4 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary transition-all duration-200 text-sm font-medium border border-primary/20 hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Hard
            </button>
            <button
              onClick={() => handleRating(4)}
              className="px-4 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent transition-all duration-200 text-sm font-medium border border-accent/20 hover:border-accent/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Good
            </button>
            <button
              onClick={() => handleRating(5)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground transition-all duration-200 text-sm font-bold shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Easy!
            </button>
          </div>
        </div>
      )}

      {/* AI Tutor Modal */}
      <AITutor
        question={question}
        isOpen={showAITutor}
        onClose={() => setShowAITutor(false)}
      />
    </div>
  );
};