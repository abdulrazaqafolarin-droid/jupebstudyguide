import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { questions, getQuestionsBySubject } from '@/data/questions';
import { Subject, SUBJECT_INFO, Question } from '@/types/question';
import { SubjectCard } from '@/components/SubjectCard';
import { StudyView } from '@/components/StudyView';
import { QuizMode, QuizResult } from '@/components/QuizMode';
import { QuizSetup, QuizPlan } from '@/components/QuizSetup';
import { ProgressRing } from '@/components/ProgressRing';
import StreakDisplay from '@/components/StreakDisplay';
import AchievementsPanel from '@/components/AchievementsPanel';
import AchievementPopup from '@/components/AchievementPopup';
import SyllabusSetup from '@/components/SyllabusSetup';
import SyllabusTracker from '@/components/SyllabusTracker';
import { useStudyProgress } from '@/hooks/useStudyProgress';
import { useCustomQuestions } from '@/hooks/useCustomQuestions';
import { useStreak } from '@/hooks/useStreak';
import { useAchievements, Achievement } from '@/hooks/useAchievements';
import { useSyllabusProgress } from '@/hooks/useSyllabusProgress';
import { useStatsSync } from '@/hooks/useStatsSync';
import { useScoreAwarder } from '@/hooks/useScoreAwarder';
import LeaderboardPanel from '@/components/LeaderboardPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStorage } from '@/hooks/useUserStorage';
import { BookOpen, Brain, Target, Flame, GraduationCap, CalendarDays, FileText, Library, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import rutexLogo from '@/assets/rutex-logo.jpg';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { TextbookUploader } from '@/components/TextbookUploader';

type View = 'home' | 'study' | 'quiz-setup' | 'quiz' | 'syllabus-setup' | 'syllabus';

const Index = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [quizPlan, setQuizPlan] = useState<QuizPlan | null>(null);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<Question[]>([]);
  const [showTextbookUpload, setShowTextbookUpload] = useState(false);
  const { getStats, updateProgress, progress } = useStudyProgress();
  const { customQuestions, refetch: refetchCustomQuestions } = useCustomQuestions();
  const { signOut, user } = useAuth();
  const { profile, syncAchievements } = useProfile();
  const { push: pushNotification } = useNotificationsContext();
  const { 
    currentStreak, 
    longestStreak, 
    totalDaysStudied, 
    totalQuestionsAnswered,
    recordStudySession, 
    hasStudiedToday 
  } = useStreak();

  const {
    answerQuestion: awardAnswer,
    correctAnswer: awardCorrect,
    streakDay: awardStreakDay,
    syllabusDay: awardSyllabusDay,
    achievement: awardAchievement,
    quizComplete: awardQuizComplete,
  } = useScoreAwarder();

  // Track previous streak to detect new streak days
  const prevStreakRef = useRef(currentStreak);

  const subjectsStudied = useMemo(() => {
    const studiedSubjects = new Set<Subject>();
    if (getStats(getQuestionsBySubject('physics')).studied > 0) studiedSubjects.add('physics');
    if (getStats(getQuestionsBySubject('chemistry')).studied > 0) studiedSubjects.add('chemistry');
    if (getStats(getQuestionsBySubject('biology')).studied > 0) studiedSubjects.add('biology');
    if (getStats(getQuestionsBySubject('math')).studied > 0) studiedSubjects.add('math');
    return studiedSubjects.size;
  }, [getStats]);
  
  // Count questions answered correctly at least once (repetitions > 0 in SM-2)
  const totalCorrect = useMemo(() => {
    return Object.values(progress).filter(p => p.repetitions > 0).length;
  }, [progress]);

  // Track consecutive correct answers for Perfect Ten achievement
  const [consecutiveCorrect, setConsecutiveCorrect] = useUserStorage<number>('consecutive-correct', 0);

  // Track actual document upload count (not question count)
  const [documentUploadCount, setDocumentUploadCount] = useUserStorage<number>('document-upload-count', 0);
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && customQuestions.length > 0) {
      const distinctNames = new Set(customQuestions.filter(q => q.document_name && q.document_name !== 'Manual Entry').map(q => q.document_name));
      if (distinctNames.size > documentUploadCount) {
        setDocumentUploadCount(distinctNames.size);
      }
      seededRef.current = true;
    }
  }, [customQuestions, documentUploadCount, setDocumentUploadCount]);

  // Track study session hours for Night Owl & Early Bird achievements
  const [sessionHours, setSessionHours] = useUserStorage<number[]>('session-hours', []);
  const studiedAfterMidnight = useMemo(() =>
    sessionHours.some(h => h >= 0 && h < 5),
    [sessionHours],
  );
  const studiedBefore6am = useMemo(() =>
    sessionHours.some(h => h >= 5 && h < 6),
    [sessionHours],
  );

  // Syllabus progress
  const {
    progress: syllabusProgress,
    startSyllabus,
    completeDay,
    canAdvanceToDay,
    resetProgress: resetSyllabusProgress,
    reorderSubjects,
    isStarted: isSyllabusStarted,
  } = useSyllabusProgress();

  // Syllabus completed progress
  const syllabusCompletedDayCount = useMemo(() => {
    if (!syllabusProgress?.dailyTasks) return 0;
    return syllabusProgress.dailyTasks.filter(t => t.isCompleted).length;
  }, [syllabusProgress]);

  const documentsUploaded = documentUploadCount;

  // Sync newly unlocked achievements to Supabase and award points
  const handleNewAchievement = useCallback((achievement: Achievement) => {
    awardAchievement(achievement.id);
  }, [awardAchievement]);

  const {
    unlockedAchievements,
    lockedAchievements,
    newlyUnlocked,
    clearNewlyUnlocked,
    totalCount: achievementTotalCount,
  } = useAchievements({
    totalQuestionsAnswered,
    totalCorrect,
    currentStreak,
    longestStreak,
    totalDaysStudied,
    questionsLearned: getStats(questions).learned,
    subjectsStudied,
    documentsUploaded,
    syllabusProgress: syllabusCompletedDayCount,
    syllabusCompleted: syllabusCompletedDayCount >= 30,
    studiedAfterMidnight,
    studiedBefore6am,
    consecutiveCorrect,
  }, handleNewAchievement);

  // Sync unlocked achievements to profiles table
  const prevUnlockedRef = useRef(0);
  useEffect(() => {
    const ids = unlockedAchievements.map(a => a.id);
    if (ids.length > prevUnlockedRef.current && ids.length > 0) {
      syncAchievements(ids);
    }
    prevUnlockedRef.current = ids.length;
  }, [unlockedAchievements, syncAchievements]);

  // Push current stats to public leaderboard (debounced upsert)
  useStatsSync({
    currentStreak,
    achievementsCount: unlockedAchievements.length,
    syllabus: syllabusProgress,
  });

  // Shared notification center (single instance via NotificationsProvider)
  const {
    notifications,
    unreadCount,
    markAllRead,
    clear: clearNotifications,
    permission: notifPermission,
    requestPermission: requestNotifPermission,
    updateStreakData,
  } = useNotificationsContext();

  // Sync streak data to the notification provider so reminders fire correctly
  useEffect(() => {
    updateStreakData({ hasStudiedToday: hasStudiedToday(), currentStreak });
  }, [hasStudiedToday, currentStreak, updateStreakData]);

  // Emit a notification each time an achievement is unlocked (de-duped by id).
  useEffect(() => {
    newlyUnlocked.forEach(a => {
      pushNotification({
        kind: 'achievement',
        title: `🏆 ${a.name} unlocked!`,
        body: a.description,
        dedupe: `ach:${a.id}`,
      });
    });
  }, [newlyUnlocked, pushNotification]);

  // Emit when syllabus day count goes up.
  const lastSyllabusDays = useRef<number | null>(null);
  useEffect(() => {
    const completed = syllabusProgress?.dailyTasks?.filter(t => t.isCompleted).length ?? 0;
    const prev = lastSyllabusDays.current;
    if (prev !== null && completed > prev) {
      pushNotification({
        kind: 'syllabus',
        title: `✅ Day ${completed} complete`,
        body: `You're ${Math.round((completed / 30) * 100)}% through your 30-day plan. Keep going!`,
        dedupe: `syll:day:${completed}`,
      });
    }
    lastSyllabusDays.current = completed;
  }, [syllabusProgress, pushNotification]);

  // Award streak_day when streak increases
  useEffect(() => {
    if (currentStreak > prevStreakRef.current && currentStreak > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      awardStreakDay(todayStr);
    }
    prevStreakRef.current = currentStreak;
  }, [currentStreak, awardStreakDay]);

  // Award achievement points for newly unlocked achievements
  useEffect(() => {
    newlyUnlocked.forEach(a => awardAchievement(a.id));
  }, [newlyUnlocked, awardAchievement]);


  // Combine built-in questions with custom questions
  const allQuestions = useMemo(() => {
    return [...questions, ...customQuestions];
  }, [customQuestions]);

  const getAllQuestionsBySubject = useCallback((subject: Subject): Question[] => {
    const builtIn = getQuestionsBySubject(subject);
    const custom = customQuestions.filter(q => q.subject === subject);
    return [...builtIn, ...custom];
  }, [customQuestions]);

  const getRandomFromAll = (count: number, subject?: Subject): Question[] => {
    const source = subject ? getAllQuestionsBySubject(subject) : allQuestions;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  const overallStats = getStats(allQuestions);

  const subjectStats = useMemo(() => {
    return (['physics', 'chemistry', 'biology', 'math'] as Subject[]).map(subject => {
      const subjectQuestions = getAllQuestionsBySubject(subject);
      const stats = getStats(subjectQuestions);
      return { subject, questions: subjectQuestions, stats };
    });
  }, [getStats, getAllQuestionsBySubject]);

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView('study');
  };

  const handleStartQuiz = (subject?: Subject) => {
    if (subject) {
      const pool = getAllQuestionsBySubject(subject);
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
      setSelectedSubject(subject);
      setQuizPlan({ perSubject: { [subject]: 10 }, uniform: false });
      setCurrentQuizQuestions(shuffled);
      setCurrentView('quiz');
    } else {
      setSelectedSubject(null);
      setQuizPlan(null);
      setCurrentView('quiz-setup');
    }
  };

  const handleQuizComplete = (result: QuizResult) => {
    // Award points for quiz completion
    const sessionId = `session_${Date.now()}`;
    awardQuizComplete(sessionId);

    // Track consecutive correct streak (for Perfect Ten achievement)
    let streak = consecutiveCorrect;
    result.answeredQuestions.forEach(({ questionId, isCorrect }) => {
      updateProgress(questionId, isCorrect ? 4 : 1);
      awardAnswer(questionId);
      if (isCorrect) {
        streak++;
        awardCorrect(questionId);
      } else {
        streak = 0;
      }
    });
    setConsecutiveCorrect(streak);

    // Record study session for streak
    recordStudySession(result.answeredQuestions.length);
    // Track study hour for Night Owl / Early Bird achievements
    const hour = new Date().getHours();
    setSessionHours(prev => {
      if (prev.includes(hour)) return prev;
      return [...prev, hour].slice(-20);
    });
  };


  const handleUploadComplete = () => {
    setDocumentUploadCount(prev => prev + 1);
    refetchCustomQuestions();
  };

  const handleBack = () => {
    setCurrentView('home');
    setSelectedSubject(null);
    setQuizPlan(null);
  };

  // Study view
  if (currentView === 'study' && selectedSubject) {
    return (
      <StudyView
        questions={getAllQuestionsBySubject(selectedSubject)}
        subject={selectedSubject}
        onBack={handleBack}
        consecutiveCorrect={consecutiveCorrect}
        onConsecutiveAnswer={(isCorrect) => {
          setConsecutiveCorrect(prev => isCorrect ? prev + 1 : 0);
        }}
      />
    );
  }

  // Quiz setup
  if (currentView === 'quiz-setup') {
    const available = {
      physics: getAllQuestionsBySubject('physics').length,
      chemistry: getAllQuestionsBySubject('chemistry').length,
      biology: getAllQuestionsBySubject('biology').length,
      math: getAllQuestionsBySubject('math').length,
    } as Record<Subject, number>;

    // Pre-seed: when user came in via a subject quick action, only that subject is on.
    const initialAvailable = selectedSubject
      ? ({ ...available, ...Object.fromEntries(
            (['physics','chemistry','biology','math'] as Subject[])
              .filter(s => s !== selectedSubject).map(s => [s, 0])
          ) } as Record<Subject, number>)
      : available;

    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <QuizSetup
          available={initialAvailable}
          onStart={(plan) => {
            setQuizPlan(plan);
            setCurrentView('quiz');
          }}
          onBack={handleBack}
        />
      </div>
    );
  }

  // Quiz view
  if (currentView === 'quiz' && (currentQuizQuestions.length > 0 || quizPlan)) {
    const quizQuestions = currentQuizQuestions.length > 0
      ? currentQuizQuestions
      : quizPlan
        ? (Object.entries(quizPlan.perSubject) as Array<[Subject, number]>)
            .flatMap(([subject, count]) => {
              const pool = getAllQuestionsBySubject(subject);
              return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
            })
            .sort(() => Math.random() - 0.5)
        : [];

    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <QuizMode
          questions={quizQuestions}
          subject={selectedSubject || undefined}
          onComplete={(result) => {
            setCurrentQuizQuestions([]);
            handleQuizComplete(result);
          }}
          onExit={() => { setCurrentQuizQuestions([]); handleBack(); }}
        />
      </div>
    );
  }

  // Syllabus setup view
  if (currentView === 'syllabus-setup') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <SyllabusSetup
          onStart={(combination) => {
            startSyllabus(combination);
            setCurrentView('syllabus');
          }}
          onCancel={handleBack}
        />
      </div>
    );
  }

  // Syllabus tracker view
  if (currentView === 'syllabus' && syllabusProgress) {
    return (
      <SyllabusTracker
        progress={syllabusProgress}
        onCompleteDay={(day, mastery) => {
          completeDay(day, mastery);
          awardSyllabusDay(day);
        }}
        canAdvanceToDay={canAdvanceToDay}
        onReorderSubjects={reorderSubjects}
        onReset={() => {
          resetSyllabusProgress();
          setCurrentView('home');
        }}
        onBack={handleBack}
      />
    );
  }

  // Home view
  return (
    <div className="min-h-screen bg-background">
      {/* Achievement Popup */}
      <AchievementPopup 
        achievements={newlyUnlocked} 
        onClose={clearNewlyUnlocked} 
      />
      
      {/* Hero Section */}
      <header className="relative overflow-hidden min-h-[60vh] flex items-center">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10 animate-mesh bg-[length:200%_200%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
        <div className="absolute inset-0 chalk-texture opacity-30" />
        
        {/* Floating decorative orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        

        
        <div className="relative w-full max-w-4xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center">
            {/* Streak Badge */}
            <div className="flex justify-center mb-6 animate-in-up stagger-1">
              <StreakDisplay 
                currentStreak={currentStreak}
                longestStreak={longestStreak}
                totalDaysStudied={totalDaysStudied}
                hasStudiedToday={hasStudiedToday()}
                compact
              />
            </div>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-in-up stagger-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">JUPEB Past Questions</span>
            </div>
            
            {/* Heading */}
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-[1.1] animate-in-up stagger-3">
              Master Your Exams with
              <span className="text-gradient-gold block mt-2">Spaced Repetition</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in-up stagger-4">
              Study Physics, Chemistry, Biology & Mathematics past questions with scientifically proven 
              learning techniques. Never forget what you've learned.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-4 animate-in-up stagger-5">
              <Button
                size="lg"
                onClick={() => isSyllabusStarted ? setCurrentView('syllabus') : setCurrentView('syllabus-setup')}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 glow-gold animate-pulse-glow shadow-lg shadow-primary/25"
              >
                <CalendarDays className="w-5 h-5 mr-2" />
                {isSyllabusStarted ? 'Continue 30-Day Syllabus' : '30-Day Syllabus Plan'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleStartQuiz()}
                className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Target className="w-5 h-5 mr-2" />
                Quick Quiz
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/past-questions')}
                className="border-accent/40 text-accent hover:bg-accent/10 hover:border-accent hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Past Questions
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {/* Overall Progress */}
        <section className="mb-12 animate-in-up stagger-1">
          <div className="relative bg-card rounded-2xl border border-border p-6 md:p-8 chalk-texture overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <ProgressRing 
                progress={overallStats.learnedPercentage} 
                size={140} 
                strokeWidth={10}
              >
                <div className="text-center">
                  <span className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{Math.round(overallStats.learnedPercentage)}%</span>
                  <p className="text-xs text-muted-foreground">Mastered</p>
                </div>
              </ProgressRing>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center border border-primary/10 hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5">
                  <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-primary">{overallStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Questions</p>
                </div>
                <div className="bg-gradient-to-br from-physics/10 to-physics/5 rounded-xl p-4 text-center border border-physics/10 hover:border-physics/30 transition-all duration-200 hover:-translate-y-0.5">
                  <Brain className="w-6 h-6 mx-auto mb-2 text-physics" />
                  <p className="text-2xl font-bold text-physics">{overallStats.studied}</p>
                  <p className="text-xs text-muted-foreground">Studied</p>
                </div>
                <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4 text-center border border-accent/10 hover:border-accent/30 transition-all duration-200 hover:-translate-y-0.5">
                  <Target className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold text-accent">{overallStats.learned}</p>
                  <p className="text-xs text-muted-foreground">Mastered</p>
                </div>
                <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-xl p-4 text-center border border-destructive/10 hover:border-destructive/30 transition-all duration-200 hover:-translate-y-0.5">
                  <Flame className="w-6 h-6 mx-auto mb-2 text-destructive" />
                  <p className="text-2xl font-bold text-destructive">{overallStats.dueToday}</p>
                  <p className="text-xs text-muted-foreground">Due Today</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Streak & Achievements Row */}
        <section className="mb-12 grid gap-4 md:grid-cols-2 animate-in-up stagger-2">
          <StreakDisplay 
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            totalDaysStudied={totalDaysStudied}
            hasStudiedToday={hasStudiedToday()}
          />
          <AchievementsPanel 
            unlockedAchievements={unlockedAchievements}
            lockedAchievements={lockedAchievements}
            totalCount={achievementTotalCount}
          />
        </section>

        {/* Live Leaderboard */}
        <section className="mb-12 animate-in-up stagger-3">
          <LeaderboardPanel />
        </section>

        {/* Subject Cards */}
        <section className="animate-in-up stagger-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Subjects</h2>
            <div className="flex items-center gap-4">
              {customQuestions.length > 0 && (
                <span className="text-sm text-primary flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  +{customQuestions.length} custom
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {allQuestions.length} questions total
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {subjectStats.map(({ subject, questions: subjectQuestions, stats }) => (
              <SubjectCard
                key={subject}
                subject={subject}
                questionCount={stats.total}
                studiedCount={stats.studied}
                learnedCount={stats.learned}
                onClick={() => handleSubjectClick(subject)}
              />
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {(['physics', 'chemistry', 'biology', 'math'] as Subject[]).map(subject => {
              const info = SUBJECT_INFO[subject];
              return (
                <button
                  key={subject}
                  onClick={() => handleStartQuiz(subject)}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-300',
                    'hover:-translate-y-1 hover:shadow-lg',
                    subject === 'physics' && 'border-physics/30 hover:border-physics hover:bg-physics/5',
                    subject === 'chemistry' && 'border-chemistry/30 hover:border-chemistry hover:bg-chemistry/5',
                    subject === 'biology' && 'border-biology/30 hover:border-biology hover:bg-biology/5',
                    subject === 'math' && 'border-math/30 hover:border-math hover:bg-math/5',
                  )}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <p className="font-medium mt-2">{info.name} Quiz</p>
                  <p className="text-xs text-muted-foreground">10 random questions</p>
                </button>
              );
            })}
            <button
              onClick={() => setShowTextbookUpload(true)}
              className="p-4 rounded-xl border border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary hover:bg-primary/5"
            >
              <Library className="w-7 h-7 mx-auto text-primary" />
              <p className="font-medium mt-2">Upload Textbook</p>
              <p className="text-xs text-muted-foreground">PDF for AI reference</p>
            </button>
          </div>
        </section>

        {/* Textbook Uploader Modal */}
        {showTextbookUpload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTextbookUpload(false)}>
            <div className="w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowTextbookUpload(false)}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-md"
              >
                <X className="w-4 h-4" />
              </button>
              <TextbookUploader onClose={() => setShowTextbookUpload(false)} />
            </div>
          </div>
        )}

        {/* Tips */}
        <section className="mt-12 bg-card rounded-2xl border border-border p-6 chalk-texture">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Study Tips
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">1.</span>
              <span><strong>Consistency beats intensity</strong> - Study a little every day rather than cramming.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">2.</span>
              <span><strong>Review due questions first</strong> - The spaced repetition algorithm knows when you're about to forget.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">3.</span>
              <span><strong>Rate honestly</strong> - If you didn't know it, mark it as hard. The system will show it again sooner.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">4.</span>
              <span><strong>Understand, don't memorize</strong> - Read the explanations carefully to truly learn.</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="flex flex-col items-center gap-3">
          <img src={rutexLogo} alt="Rutex Logo" className="w-10 h-10 rounded-lg object-cover" />
          <p className="text-xs text-muted-foreground">Built by <span className="font-semibold text-foreground">Rutex</span></p>
          <p className="text-xs text-muted-foreground">JUPEB Past Questions • 2015–2020</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
