import { useState, useEffect } from 'react';
import { Question, Subject, SUBJECT_INFO } from '@/types/question';
import { Flashcard } from './Flashcard';
import { useStudyProgress } from '@/hooks/useStudyProgress';
import { useStreak } from '@/hooks/useStreak';
import { ArrowLeft, Shuffle, BookOpen, Brain, Flame, Sparkles, Target } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface StudyViewProps {
  questions: Question[];
  subject: Subject;
  onBack: () => void;
  consecutiveCorrect?: number;
  onConsecutiveAnswer?: (isCorrect: boolean) => void;
}

type StudyMode = 'learn' | 'review';

export const StudyView = ({ questions, subject, onBack, consecutiveCorrect, onConsecutiveAnswer }: StudyViewProps) => {
  const [mode, setMode] = useState<StudyMode>('learn');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffleKey, setShuffleKey] = useState(0);
  const { updateProgress, getDueQuestions, getStats } = useStudyProgress();
  const { currentStreak, recordStudySession } = useStreak();

  const subjectInfo = SUBJECT_INFO[subject];
  const stats = getStats(questions);

  const [studyQueue, setStudyQueue] = useState<Question[]>(() =>
    mode === 'review' ? getDueQuestions(questions) : [...questions].sort(() => Math.random() - 0.5)
  );

  useEffect(() => {
    if (mode === 'review') {
      setStudyQueue(getDueQuestions(questions));
    } else {
      setStudyQueue([...questions].sort(() => Math.random() - 0.5));
    }
  }, [mode, shuffleKey, questions.length]);

  const currentQuestion = studyQueue[currentIndex];
  const hasQuestions = studyQueue.length > 0;

  const handleAnswer = (quality: number) => {
    if (currentQuestion) {
      updateProgress(currentQuestion.id, quality);
      onConsecutiveAnswer?.(quality >= 3);
      recordStudySession(1);
    }
    
    if (currentIndex < studyQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleShuffle = () => {
    setCurrentIndex(0);
    setShuffleKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', `subject-${subject}`)}>
                {subjectInfo.icon} {subjectInfo.name}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {currentStreak > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-sm">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="font-bold">{currentStreak}</span>
                </div>
              )}
              <span className="text-sm text-muted-foreground font-medium">
                {currentIndex + 1} / {studyQueue.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Mode selector */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={mode === 'learn' ? 'default' : 'outline'}
            onClick={() => { setMode('learn'); setCurrentIndex(0); }}
            className={cn(
              'gap-2',
              mode === 'learn' && 'bg-primary text-primary-foreground shadow-md'
            )}
          >
            <BookOpen className="w-4 h-4" />
            Learn All
          </Button>
          <Button
            variant={mode === 'review' ? 'default' : 'outline'}
            onClick={() => { setMode('review'); setCurrentIndex(0); }}
            className={cn(
              'gap-2',
              mode === 'review' && 'bg-primary text-primary-foreground shadow-md'
            )}
          >
            <Brain className="w-4 h-4" />
            Review Due ({getDueQuestions(questions).length})
          </Button>
          <Button variant="outline" onClick={handleShuffle} size="icon">
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/10 p-5 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <BookOpen className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold text-primary">{stats.studied}</p>
            <p className="text-xs text-muted-foreground mt-1">Studied</p>
          </div>
          <div className="relative bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/10 p-5 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <Target className="w-5 h-5 mx-auto mb-2 text-accent" />
            <p className="text-3xl font-bold text-accent">{stats.learned}</p>
            <p className="text-xs text-muted-foreground mt-1">Mastered</p>
          </div>
          <div className="relative bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-2xl border border-destructive/10 p-5 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <Flame className="w-5 h-5 mx-auto mb-2 text-destructive" />
            <p className="text-3xl font-bold text-destructive">{stats.dueToday}</p>
            <p className="text-xs text-muted-foreground mt-1">Due Today</p>
          </div>
        </div>

        {/* Flashcard */}
        {hasQuestions && currentQuestion ? (
          <Flashcard
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswer={handleAnswer}
          />
        ) : (
          <div className="text-center py-16 px-4 animate-scale-in">
            <div className="relative inline-block mb-8">
              <div className="text-7xl mb-4">
                {mode === 'review' ? '🎯' : '🎉'}
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-xs animate-pulse">
                ✓
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3">
              {mode === 'review' ? 'All Reviewed!' : 'Amazing Work!'}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
              {mode === 'review' 
                ? "You've reviewed all due questions. Come back later or switch to Learn mode."
                : "Great job studying! Keep up the good work."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={onBack} size="lg" variant="outline">
                Back to Subjects
              </Button>
              {mode === 'review' && (
                <Button onClick={() => { setMode('learn'); setCurrentIndex(0); }} size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Learn Mode
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};