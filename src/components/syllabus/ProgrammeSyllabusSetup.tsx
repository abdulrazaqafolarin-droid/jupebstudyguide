import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { BookOpen, Calendar, ChevronRight, GraduationCap, Info } from "lucide-react";

export interface SyllabusSubjectChoice<T extends string = string> {
  id: T;
  name: string;
  icon: string;
}

interface ProgrammeSyllabusSetupProps<T extends string> {
  title: string;
  description?: string;
  requiredSubjects: SyllabusSubjectChoice<T>[];
  optionalSubjects: SyllabusSubjectChoice<T>[];
  initialOptionalSubjects?: T[];
  minimumOptionalSelections?: number;
  maximumOptionalSelections?: number;
  onStart: (subjects: T[]) => void;
  onCancel: () => void;
}

/**
 * Shared JUPEB/JAMB setup surface. Programme rules and syllabus subject data
 * are inputs; measurements, typography, copy hierarchy and interactions stay
 * shared so the two workspaces cannot drift visually.
 */
export function ProgrammeSyllabusSetup<T extends string>({
  title,
  description = "Master the entire syllabus with our AI-guided learning program",
  requiredSubjects,
  optionalSubjects,
  initialOptionalSubjects = [],
  minimumOptionalSelections = 0,
  maximumOptionalSelections = optionalSubjects.length,
  onStart,
  onCancel,
}: ProgrammeSyllabusSetupProps<T>) {
  const validInitial = initialOptionalSubjects.filter((subject) =>
    optionalSubjects.some((item) => item.id === subject),
  );
  const [selected, setSelected] = useState<T[]>(validInitial.slice(0, maximumOptionalSelections));
  const [error, setError] = useState("");

  const toggleSubject = (subject: T) => {
    setError("");
    setSelected((previous) => {
      if (previous.includes(subject)) return previous.filter((item) => item !== subject);
      if (previous.length >= maximumOptionalSelections) {
        setError(`Select no more than ${maximumOptionalSelections} optional subjects.`);
        return previous;
      }
      return [...previous, subject];
    });
  };

  const handleStart = () => {
    if (selected.length < minimumOptionalSelections || selected.length > maximumOptionalSelections) {
      setError(
        minimumOptionalSelections === maximumOptionalSelections
          ? `Select exactly ${minimumOptionalSelections} optional subjects to continue.`
          : `Select between ${minimumOptionalSelections} and ${maximumOptionalSelections} optional subjects to continue.`,
      );
      return;
    }
    onStart([...requiredSubjects.map((subject) => subject.id), ...selected]);
  };

  const totalSelected = requiredSubjects.length + selected.length;

  return (
    <Card className="max-w-lg mx-auto border-primary/30">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
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

        {requiredSubjects.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Core Subjects (Required)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {requiredSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className={cn(
                    "p-4 rounded-xl border-2 border-primary/50 bg-primary/5",
                    "flex items-center gap-3 opacity-90",
                  )}
                >
                  <span className="text-2xl">{subject.icon}</span>
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">Required</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {optionalSubjects.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Elective Subjects (Select if applicable)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {optionalSubjects.map((subject) => {
                const isSelected = selected.includes(subject.id);
                const limitReached = !isSelected && selected.length >= maximumOptionalSelections;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={limitReached}
                    onClick={() => toggleSubject(subject.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      "flex items-center gap-3",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                      limitReached && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <span className="text-2xl">{subject.icon}</span>
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">Optional</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="bg-secondary/30 rounded-lg p-4">
          <p className="text-sm text-center">
            You will study <span className="font-bold text-primary">{totalSelected} subjects</span> over{" "}
            <span className="font-bold text-primary">30 days</span>
          </p>
        </div>

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
}

export default ProgrammeSyllabusSetup;
