import { useState, useEffect, useRef, useCallback } from 'react';
import { Question, Subject, SUBJECT_INFO } from '@/types/question';
import { cn } from '@/lib/utils';
import { ProgressRing } from './ProgressRing';
import { Check, X, Clock, Trophy, RotateCcw, Star, Zap, Target, Brain, ArrowRight, Timer, AlertTriangle, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { useQuizTimer } from '@/hooks/useQuizTimer';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuizModeProps {
  questions: Question[];
  onComplete: (results: QuizResult) => void;
  onExit: () => void;
  subject?: Subject;
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeSpent: number; // in seconds
  answeredQuestions: Array<{
    questionId: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

const TIMER_PRESETS = [
  { label: '15 min', value: 15, gradient: 'from-emerald-500/20 to-emerald-600/10 hover:from-emerald-500/30 hover:to-emerald-600/20' },
  { label: '30 min', value: 30, gradient: 'from-sky-500/20 to-sky-600/10 hover:from-sky-500/30 hover:to-sky-600/20' },
  { label: '1 hour', value: 60, gradient: 'from-violet-500/20 to-violet-600/10 hover:from-violet-500/30 hover:to-violet-600/20' },
];

function hasRealAnswer(q: Question): boolean {
  return !!q.correctAnswer && q.correctAnswer !== "TBD" && q.correctAnswer !== "tbd";
}

export const QuizMode = ({ questions, onComplete, onExit, subject }: QuizModeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: string; isCorrect: boolean; timeSpent: number }>>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [showTimerSelect, setShowTimerSelect] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useQuizTimer();
  const isMobile = useIsMobile();

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const timerWarn = timer.state === "running" && timer.progress <= 0.1 && timer.progress > 0.02;
  const timerCrit = timer.state === "running" && timer.progress <= 0.02;

  const forceComplete = useCallback(() => {
    const totalTime = (Date.now() - startTime) / 1000;
    const result: QuizResult = {
      totalQuestions: answers.length,
      correctAnswers: answers.filter(a => a.isCorrect).length,
      wrongAnswers: answers.filter(a => !a.isCorrect).length,
      timeSpent: totalTime,
      answeredQuestions: answers,
    };
    setQuizComplete(true);
    onComplete(result);
  }, [answers, startTime, onComplete]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const handleTimerSelect = (minutes: number) => {
    timer.start(minutes, () => forceComplete());
    setShowTimerSelect(false);
  };

  const handleNoTimer = () => {
    setShowTimerSelect(false);
  };

  const handleOptionClick = (label: string) => {
    if (selectedOption) return;
    setSelectedOption(label);
    setShowResult(true);
  };

  const handleNext = () => {
    const timeSpent = (Date.now() - questionStartTime) / 1000;
    const hasRealAnswer = !!currentQuestion.correctAnswer && currentQuestion.correctAnswer !== "TBD" && currentQuestion.correctAnswer !== "tbd";
    const isCorrect = hasRealAnswer ? selectedOption === currentQuestion.correctAnswer : true;

    const newAnswers = [...answers, {
      questionId: currentQuestion.id,
      isCorrect,
      timeSpent,
    }];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      // Quiz complete
      const totalTime = (Date.now() - startTime) / 1000;
      const result: QuizResult = {
        totalQuestions: questions.length,
        correctAnswers: newAnswers.filter(a => a.isCorrect).length,
        wrongAnswers: newAnswers.filter(a => !a.isCorrect).length,
        timeSpent: totalTime,
        answeredQuestions: newAnswers,
      };
      setQuizComplete(true);
      onComplete(result);
    }
  };

  if (!questions.length) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">No questions available</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Check back later or try a different subject.</p>
      </div>
    );
  }

  if (quizComplete) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    const getGrade = () => {
      if (percentage >= 90) return { label: 'Excellent!', icon: '🏆', color: 'text-primary' };
      if (percentage >= 80) return { label: 'Great Job!', icon: '🌟', color: 'text-accent' };
      if (percentage >= 60) return { label: 'Good Effort!', icon: '💪', color: 'text-physics' };
      if (percentage >= 40) return { label: 'Keep Trying!', icon: '📚', color: 'text-chemistry' };
      return { label: 'Keep Studying!', icon: '🎯', color: 'text-destructive' };
    };
    const grade = getGrade();

    return (
      <div className="max-w-lg mx-auto animate-scale-in">
        <div className="relative bg-card rounded-2xl border border-border p-8 chalk-texture overflow-hidden">
          {/* Decorative blurs */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative">
            {/* Grade icon */}
            <div className="text-6xl mb-4">{grade.icon}</div>
            
            <h2 className="text-2xl font-bold mb-1">{grade.label}</h2>
            <p className="text-muted-foreground mb-6">
              {subject && `${SUBJECT_INFO[subject].icon} ${SUBJECT_INFO[subject].name}`}
            </p>

            {/* Score ring */}
            <ProgressRing 
              progress={percentage} 
              size={160} 
              strokeWidth={12}
              className="mx-auto mb-6"
            >
              <div className="text-center">
                <span className={cn("text-4xl font-bold", grade.color)}>{percentage}%</span>
                <p className="text-xs text-muted-foreground mt-0.5">Score</p>
              </div>
            </ProgressRing>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4 border border-accent/10">
                <Check className="w-5 h-5 mx-auto mb-1.5 text-accent" />
                <p className="text-2xl font-bold text-accent">{correctCount}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-xl p-4 border border-destructive/10">
                <X className="w-5 h-5 mx-auto mb-1.5 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{questions.length - correctCount}</p>
                <p className="text-xs text-muted-foreground">Wrong</p>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/10">
                <Clock className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-2xl font-bold text-primary">{Math.round((Date.now() - startTime) / 1000)}s</p>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
            </div>

            {/* Message */}
            <p className="text-sm text-muted-foreground mb-6">
              {percentage >= 90 ? "Outstanding performance! You're exam-ready." :
               percentage >= 80 ? "Excellent work! Keep the momentum going." :
               percentage >= 60 ? "Good progress! Review the questions you missed." :
               percentage >= 40 ? "You're building foundation. Keep practicing!" :
               "Don't give up! Consistency is key to improvement."}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={onExit} variant="outline" className="flex-1 group">
                Back to Home
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button onClick={() => {
                setCurrentIndex(0);
                setSelectedOption(null);
                setAnswers([]);
                setStartTime(Date.now());
                setShowResult(false);
                setQuizComplete(false);
              }} className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showTimerSelect) {
    return (
      <div className="max-w-md mx-auto animate-scale-in">
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Timer className="w-12 h-12 mx-auto mb-4 text-primary opacity-60" />
          <h2 className="text-xl font-bold mb-2">Set a Timer</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Choose a time limit for this quiz, or start without one.
          </p>
          <div className="flex flex-col gap-3 mb-6">
            {TIMER_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleTimerSelect(preset.value)}
                className={`w-full py-3 px-4 rounded-xl bg-gradient-to-br ${preset.gradient} border border-transparent hover:shadow-sm transition-all font-medium text-sm active:scale-[0.98]`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={handleNoTimer}
              className="w-full py-3 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary/50 transition-all active:scale-[0.98]"
            >
              No timer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress header */}
      <div className="mb-6 animate-in-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Question {currentIndex + 1}
            </span>
            <span className="text-sm text-muted-foreground">of {questions.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Timer indicator */}
            {timer.state === "running" && (
              <span className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tabular-nums transition-colors",
                timerCrit ? "bg-destructive/15 text-destructive" :
                timerWarn ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                "bg-secondary/80 text-muted-foreground"
              )}>
                {timerCrit || timerWarn ? <AlertTriangle className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
                {timer.formatted}
              </span>
            )}
            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
              {Math.round(progress)}%
            </span>
            <button
              onClick={onExit}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full hover:bg-secondary/50"
            >
              Exit
            </button>
          </div>
        </div>
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Timer progress bar */}
        {timer.state === "running" && (
          <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full transition-colors",
                timerCrit ? "bg-destructive" :
                timerWarn ? "bg-amber-500" :
                "bg-primary/30"
              )}
              initial={false}
              animate={{ width: `${(1 - timer.progress) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        )}
        {timerCrit && timer.state === "running" && (
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-[11px] font-medium text-destructive text-right mt-1"
          >
            Time almost up!
          </motion.p>
        )}
      </div>

      {/* Question card */}
      <div ref={cardRef} className="bg-card rounded-2xl border border-border p-6 chalk-texture animate-scale-in" key={currentIndex}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            `subject-${currentQuestion.subject}`
          )}>
            {SUBJECT_INFO[currentQuestion.subject].icon} {currentQuestion.topic}
          </span>
        </div>

        {/* Question */}
        <h3 className="text-lg font-medium mb-6 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options?.map((option) => {
            const isSelected = selectedOption === option.label;
            const isCorrectOption = hasRealAnswer(currentQuestion) && option.label === currentQuestion.correctAnswer;

            return (
              <button
                key={option.label}
                onClick={() => handleOptionClick(option.label)}
                disabled={selectedOption !== null}
                className={cn(
                  'w-full p-4 rounded-xl text-left transition-all duration-300 border-2',
                  'flex items-start gap-3',
                  !showResult && 'hover:border-primary hover:bg-primary/5',
                  !showResult && 'border-border bg-secondary/30',
                  showResult && isCorrectOption && 'border-accent bg-accent/10',
                  showResult && isSelected && !isCorrectOption && 'border-destructive bg-destructive/10',
                  showResult && !isSelected && !isCorrectOption && 'border-border opacity-50'
                )}
              >
                <span className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-mono font-semibold',
                  !showResult && 'bg-secondary text-foreground',
                  showResult && isCorrectOption && 'bg-accent text-accent-foreground',
                  showResult && isSelected && !isCorrectOption && 'bg-destructive text-destructive-foreground',
                  showResult && !isSelected && !isCorrectOption && 'bg-secondary text-muted-foreground'
                )}>
                  {showResult && isCorrectOption ? <Check className="w-4 h-4" /> : 
                   showResult && isSelected && !isCorrectOption ? <X className="w-4 h-4" /> :
                   option.label}
                </span>
                <span className="font-mono text-sm leading-relaxed pt-1">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showResult && (
          <div className={cn(
            'mt-6 p-4 rounded-xl animate-in-up',
            hasRealAnswer(currentQuestion) && selectedOption === currentQuestion.correctAnswer 
              ? 'bg-accent/10 border border-accent/30' 
              : 'bg-destructive/10 border border-destructive/30'
          )}>
            <p className="text-sm leading-relaxed">
              <strong className={hasRealAnswer(currentQuestion) && selectedOption === currentQuestion.correctAnswer ? 'text-accent' : 'text-destructive'}>
                {hasRealAnswer(currentQuestion) && selectedOption === currentQuestion.correctAnswer ? '✓ Correct!' : !hasRealAnswer(currentQuestion) ? 'Answer recorded' : '✗ Incorrect'}
              </strong>
              {' '}{currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {showResult && (
          <Button
            onClick={handleNext}
            className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </Button>
        )}
      </div>
    </div>
  );
};
