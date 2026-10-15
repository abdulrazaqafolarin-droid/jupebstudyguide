import React, { useState } from 'react';
import { DailyTask, SyllabusTopic } from '@/types/syllabus';
import { SUBJECT_INFO } from '@/types/question';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Target,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Sparkles,
  Lock,
  PlayCircle,
} from 'lucide-react';
import AITeachingPage from './AITeachingPage';
import QuestionMath from './QuestionMath';

interface SyllabusDayViewProps {
  task: DailyTask;
  canAdvance: boolean;
  onComplete: (masteryScore: number) => void;
  onBack: () => void;
  onAskTutor: (topic: SyllabusTopic, question: string) => void;
}

export const SyllabusDayView: React.FC<SyllabusDayViewProps> = ({
  task,
  canAdvance,
  onComplete,
  onBack,
  onAskTutor,
}) => {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(
    task.topics[0]?.id || null
  );
  const [selfAssessment, setSelfAssessment] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [showMasteryCheck, setShowMasteryCheck] = useState(false);
  const [teachingTopic, setTeachingTopic] = useState<SyllabusTopic | null>(null);

  const subjectInfo = SUBJECT_INFO[task.subject];
  const allObjectivesChecked = task.learningObjectives.every(
    (_, i) => selfAssessment[`obj-${i}`]
  );

  const handleObjectiveToggle = (index: number) => {
    setSelfAssessment(prev => ({
      ...prev,
      [`obj-${index}`]: !prev[`obj-${index}`],
    }));
  };

  const handleComplete = () => {
    // Calculate mastery score based on self-assessment
    const checkedCount = Object.values(selfAssessment).filter(Boolean).length;
    const masteryScore = task.learningObjectives.length > 0 ? (checkedCount / task.learningObjectives.length) * 100 : 100;
    onComplete(Math.round(masteryScore));
  };

  // Show AI Teaching Page if a topic is selected for teaching
  if (teachingTopic) {
    return (
      <AITeachingPage
        task={task}
        topic={teachingTopic}
        onBack={() => setTeachingTopic(null)}
        onComplete={() => {
          // Mark objectives as checked when coming back from teaching
          task.learningObjectives.forEach((_, i) => {
            setSelfAssessment(prev => ({ ...prev, [`obj-${i}`]: true }));
          });
          setTeachingTopic(null);
        }}
      />
    );
  }

  if (!canAdvance) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Day Locked</h2>
            <p className="text-muted-foreground mb-4">
              Complete the previous day with at least 70% mastery to unlock this day.
            </p>
            <Button onClick={onBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
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
              <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium', `subject-${task.subject}`)}>
                {subjectInfo.icon} Day {task.day}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              {task.isCompleted ? (
                <span className="flex items-center gap-1 text-accent">
                  <CheckCircle className="w-4 h-4" /> Completed
                </span>
              ) : (
                'In Progress'
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Daily Overview */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl">Day {task.day} Learning Plan</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {task.topics.length > 0
                    ? `${task.topics.length} topic(s) to cover`
                    : 'Review and practice day'}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* Topics to Cover */}
            {task.topics.length > 0 ? (
              <div className="space-y-4">
                {task.topics.map(topic => (
                  <div
                    key={topic.id}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          topic.difficulty === 'beginner' && 'bg-accent/20 text-accent',
                          topic.difficulty === 'intermediate' && 'bg-primary/20 text-primary',
                          topic.difficulty === 'advanced' && 'bg-destructive/20 text-destructive',
                        )}>
                          {topic.difficulty}
                        </span>
                        <span className="font-medium"><QuestionMath inline content={topic.name} /></span>
                      </div>
                      {expandedTopic === topic.id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    
                    {expandedTopic === topic.id && (
                      <div className="p-4 pt-0 border-t border-border space-y-4">
                        <p className="text-sm text-muted-foreground"><QuestionMath inline content={topic.description} /></p>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Subtopics:</h4>
                          <ul className="space-y-1">
                            {topic.subtopics.map((sub, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <QuestionMath inline content={sub} />
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Start Learning Button - Goes to full teaching page */}
                        <Button
                          size="lg"
                          className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          onClick={() => setTeachingTopic(topic)}
                        >
                          <PlayCircle className="w-5 h-5" />
                          Start Learning This Topic
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
                <h3 className="font-medium mb-2">Review Day</h3>
                <p className="text-sm text-muted-foreground">
                  Practice past questions and review concepts from previous days.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learning Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {task.learningObjectives.map((objective, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selfAssessment[`obj-${i}`] || false}
                    onChange={() => handleObjectiveToggle(i)}
                    className="mt-1 rounded border-border"
                  />
                  <span className={cn(
                    'text-sm transition-colors',
                    selfAssessment[`obj-${i}`]
                      ? 'text-accent line-through'
                      : 'text-foreground group-hover:text-primary'
                  )}>
                    <QuestionMath inline content={objective} />
                  </span>
                </label>
              ))}
            </div>
            
            <div className="mt-4">
              <Progress
                value={(Object.values(selfAssessment).filter(Boolean).length / task.learningObjectives.length) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {Object.values(selfAssessment).filter(Boolean).length} of {task.learningObjectives.length} objectives completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Checkpoint Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="w-5 h-5 text-primary" />
              Self-Check Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.checkpointQuestions.map((question, i) => (
              <div key={i} className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium mb-2"><QuestionMath inline content={question} /></p>
                <p className="text-xs text-muted-foreground">
                  Start learning a topic above to get help with this question.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your notes, key insights, or questions here..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Complete Day Button */}
        {!task.isCompleted && (
          <div className="sticky bottom-4">
            <Button
              onClick={() => allObjectivesChecked ? handleComplete() : setShowMasteryCheck(true)}
              disabled={Object.values(selfAssessment).filter(Boolean).length === 0}
              className="w-full py-6 text-lg gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Complete Day {task.day}
            </Button>
            
            {showMasteryCheck && !allObjectivesChecked && (
              <p className="text-center text-sm text-destructive mt-2">
                Please complete all learning objectives before marking this day as complete.
              </p>
            )}
          </div>
        )}

        {task.isCompleted && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Day Completed - {task.masteryScore}% Mastery</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SyllabusDayView;
