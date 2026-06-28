import { useState, useMemo, useCallback, useEffect } from "react";
import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import { getStudyQuestionsBySubject, subscribe, isDataReady } from "@/data/study-questions";

export function useStudyQuestions() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StudyCategory>("objective");
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(isDataReady());

  useEffect(() => subscribe(() => {
    setTick(t => t + 1);
    setReady(isDataReady());
  }), []);

  const questions = useMemo(() => {
    if (!selectedSubject || !selectedYear) return [];
    void tick;
    return getStudyQuestionsBySubject(selectedSubject, selectedYear, selectedCategory);
  }, [selectedSubject, selectedYear, selectedCategory, tick]);

  const selectSubject = useCallback((s: Subject) => setSelectedSubject(s), []);
  const selectYear = useCallback((y: number) => setSelectedYear(y), []);
  const selectCategory = useCallback((c: StudyCategory) => setSelectedCategory(c), []);
  const reset = useCallback(() => {
    setSelectedSubject(null);
    setSelectedYear(null);
    setSelectedCategory("objective");
  }, []);

  return {
    selectedSubject, selectedYear, selectedCategory,
    questions, tick, isReady: ready,
    selectSubject, selectYear, selectCategory, reset,
  };
}
