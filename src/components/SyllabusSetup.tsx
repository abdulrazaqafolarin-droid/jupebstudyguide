import React, { useState } from 'react';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { UserSubjectCombination } from '@/types/syllabus';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { GraduationCap, BookOpen, Calendar, ChevronRight, Info } from 'lucide-react';

interface SyllabusSetupProps {
  onStart: (combination: UserSubjectCombination) => void;
  onCancel: () => void;
}

export const SyllabusSetup: React.FC<SyllabusSetupProps> = ({ onStart, onCancel }) => {
  // Physics and Chemistry are mandatory for all JUPEB students
  const [hasBiology, setHasBiology] = useState(false);
  const [hasMath, setHasMath] = useState(false);

  const handleStart = () => {
    const combination: UserSubjectCombination = {
      core: ['physics', 'chemistry'],
      elective: [],
    };
    
    if (hasBiology) combination.elective.push('biology');
    if (hasMath) combination.elective.push('math');
    
    onStart(combination);
  };

  const selectedCount = 2 + (hasBiology ? 1 : 0) + (hasMath ? 1 : 0);

  return (
    <Card className="max-w-lg mx-auto border-primary/30">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">30-Day JUPEB Syllabus</CardTitle>
        <CardDescription>
          Master the entire syllabus with our AI-guided learning program
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">How it works:</p>
            <ul className="text-muted-foreground mt-1 space-y-1">
              <li>• AI divides topics into 30 daily lessons</li>
              <li>• Each day has specific learning objectives</li>
              <li>• You must demonstrate understanding before advancing</li>
              <li>• AI tutor helps you master each concept</li>
            </ul>
          </div>
        </div>

        {/* Core Subjects - Always Selected */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Core Subjects (Required)
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {(['physics', 'chemistry'] as Subject[]).map(subject => {
              const info = SUBJECT_INFO[subject];
              return (
                <div
                  key={subject}
                  className={cn(
                    'p-4 rounded-xl border-2 border-primary/50 bg-primary/5',
                    'flex items-center gap-3 opacity-90'
                  )}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="font-medium">{info.name}</p>
                    <p className="text-xs text-muted-foreground">Required</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Elective Subjects */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Elective Subjects (Select if applicable)
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Biology */}
            <button
              onClick={() => setHasBiology(!hasBiology)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all text-left',
                'flex items-center gap-3',
                hasBiology 
                  ? 'border-biology bg-biology/10' 
                  : 'border-border hover:border-biology/50'
              )}
            >
              <Checkbox checked={hasBiology} className="pointer-events-none" />
              <span className="text-2xl">{SUBJECT_INFO.biology.icon}</span>
              <div>
                <p className="font-medium">Biology</p>
                <p className="text-xs text-muted-foreground">Optional</p>
              </div>
            </button>

            {/* Mathematics */}
            <button
              onClick={() => setHasMath(!hasMath)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all text-left',
                'flex items-center gap-3',
                hasMath 
                  ? 'border-math bg-math/10' 
                  : 'border-border hover:border-math/50'
              )}
            >
              <Checkbox checked={hasMath} className="pointer-events-none" />
              <span className="text-2xl">{SUBJECT_INFO.math.icon}</span>
              <div>
                <p className="font-medium">Mathematics</p>
                <p className="text-xs text-muted-foreground">Optional</p>
              </div>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-secondary/30 rounded-lg p-4">
          <p className="text-sm text-center">
            You will study <span className="font-bold text-primary">{selectedCount} subjects</span> over{' '}
            <span className="font-bold text-primary">30 days</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleStart} className="flex-1 gap-2">
            Start Learning
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyllabusSetup;
