import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Flame, BookOpen, Brain, Target, Award, Zap, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, CartesianGrid } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyProgress } from '@/hooks/useStudyProgress';
import { useStreak } from '@/hooks/useStreak';
import { supabase } from '@/integrations/supabase/client';
import { STUDY_SUBJECT_INFO } from '@/types/study-questions';
import { getStudyQuestionsBySubject } from '@/data/study-questions';
import { STUDY_YEARS } from '@/types/study-questions';
import type { Subject } from '@/types/question';
import type { StudyCategory } from '@/types/study-questions';
import { cn } from '@/lib/utils';

const SUBJECTS: Subject[] = ['physics', 'chemistry', 'biology', 'math'];
const CATEGORIES: StudyCategory[] = ['objective', 'theory', 'practical'];

interface ScoreEvent {
  amount: number;
  reason: string;
  created_at: string;
}

interface WeeklyScore {
  week: string;
  total: number;
  count: number;
}

export default function StudyStatsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getStats, progress, isLoaded } = useStudyProgress();
  const streak = useStreak();
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [loadingScore, setLoadingScore] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingScore(true);
    supabase
      .from('score_events')
      .select('amount, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setScoreEvents(data as ScoreEvent[] || []);
        setLoadingScore(false);
      });
  }, [user]);

  const allQuestions = useMemo(() => {
    const qs: { id: string; subject: Subject }[] = [];
    for (const year of STUDY_YEARS) {
      for (const s of SUBJECTS) {
        for (const c of CATEGORIES) {
          for (const q of getStudyQuestionsBySubject(s, year, c)) {
            qs.push({ id: q.id, subject: s as Subject });
          }
        }
      }
    }
    return qs;
  }, []);

  const overallStats = useMemo(() => {
    if (!isLoaded) return { total: 0, studied: 0, learned: 0, dueToday: 0, studiedPercentage: 0, learnedPercentage: 0 };
    return getStats(allQuestions);
  }, [allQuestions, getStats, isLoaded]);

  const subjectStats = useMemo(() => {
    return SUBJECTS.map(s => {
      const subjectQuestions = allQuestions.filter(q => q.subject === s);
      const total = subjectQuestions.length;
      const studied = subjectQuestions.filter(q => progress[q.id]).length;
      const learned = subjectQuestions.filter(q => progress[q.id]?.isLearned).length;
      return { subject: s, total, studied, learned, label: STUDY_SUBJECT_INFO[s].label };
    });
  }, [allQuestions, progress]);

  const weeklyScores: WeeklyScore[] = useMemo(() => {
    if (scoreEvents.length === 0) return [];
    const map = new Map<string, { total: number; count: number }>();
    for (const ev of scoreEvents) {
      const d = new Date(ev.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      const existing = map.get(key) ?? { total: 0, count: 0 };
      existing.total += ev.amount;
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12);
  }, [scoreEvents]);

  const totalScore = useMemo(() => scoreEvents.reduce((sum, e) => sum + e.amount, 0), [scoreEvents]);

  const formatScoreDate = (week: string) => {
    const d = new Date(week);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-sm">Study Stats</h1>
            <p className="text-[10px] text-muted-foreground">Your learning analytics</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Questions', value: overallStats.total, icon: BookOpen, color: 'text-blue-500' },
            { label: 'Studied', value: `${Math.round(overallStats.studiedPercentage)}%`, sub: `${overallStats.studied}/${overallStats.total}`, icon: Brain, color: 'text-emerald-500' },
            { label: 'Mastered', value: `${Math.round(overallStats.learnedPercentage)}%`, sub: `${overallStats.learned}/${overallStats.total}`, icon: Target, color: 'text-violet-500' },
            { label: 'Due Today', value: overallStats.dueToday, icon: Zap, color: overallStats.dueToday > 0 ? 'text-amber-500' : 'text-muted-foreground' },
          ].map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <card.icon className={cn('w-4 h-4', card.color)} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.sub && <p className="text-[10px] text-muted-foreground -mt-1">{card.sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* Streak Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Streak
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              {streak.totalDaysStudied} total days
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">{streak.currentStreak}</p>
              <p className="text-[10px] text-muted-foreground">Current streak</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold">{streak.longestStreak}</p>
              <p className="text-[10px] text-muted-foreground">Best streak</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold">{streak.totalQuestionsAnswered}</p>
              <p className="text-[10px] text-muted-foreground">Questions answered</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Today:</span>
            {streak.hasStudiedToday() ? (
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Studied
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted" />
                Not studied yet
              </span>
            )}
          </div>
        </motion.div>

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Total Score
            </h2>
            <span className="text-2xl font-bold text-amber-500">{totalScore.toLocaleString()}</span>
          </div>
          {!loadingScore && weeklyScores.length > 0 && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyScores}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatScoreDate}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={formatScoreDate}
                    formatter={(value: number) => [value.toLocaleString(), 'Score']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    fill="url(#scoreGradient)"
                    strokeWidth={2}
                  />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {!loadingScore && weeklyScores.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Answer questions correctly to start earning score
            </p>
          )}
        </motion.div>

        {/* Subject Performance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Performance by Subject
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectStats} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="studied" name="Studied" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" maxBarSize={32} />
                <Bar dataKey="learned" name="Mastered" radius={[4, 4, 0, 0]} fill="hsl(var(--accent))" maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-primary" />
              Studied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-accent" />
              Mastered
            </span>
          </div>
        </motion.div>

        {/* Subject Detail Cards */}
        <div className="grid grid-cols-2 gap-3">
          {subjectStats.map((s) => {
            const info = STUDY_SUBJECT_INFO[s.subject];
            const pct = s.total > 0 ? Math.round((s.learned / s.total) * 100) : 0;
            return (
              <motion.div
                key={s.subject}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="text-sm font-semibold capitalize">{s.subject}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.studied}/{s.total} studied</span>
                  <span className="font-medium text-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
