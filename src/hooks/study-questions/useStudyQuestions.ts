import { useState, useMemo, useCallback } from "react";
import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory, StudyBookmark, StudyProgressEntry } from "@/types/study-questions";
import { getStudyQuestionsBySubject, getStudyQuestionsByYear } from "@/data/study-questions";

export function useStudyQuestions() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StudyCategory>("objective");

  const questions = useMemo(() => {
    if (!selectedSubject || !selectedYear) return [];
    return getStudyQuestionsBySubject(selectedSubject, selectedYear, selectedCategory);
  }, [selectedSubject, selectedYear, selectedCategory]);

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
    questions,
    selectSubject, selectYear, selectCategory, reset,
  };
}
