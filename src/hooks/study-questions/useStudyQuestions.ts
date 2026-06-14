import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory, StudyBookmark, StudyProgressEntry } from "@/types/study-questions";
import { getStudyQuestionsBySubject, getStudyQuestionsByYear } from "@/data/study-questions";
import { isMergedReady } from "@/data/study-questions";

export function useStudyQuestions() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StudyCategory>("objective");
  const [cacheTick, setCacheTick] = useState(0);
  const wasReadyRef = useRef(false);

  useEffect(() => {
    const check = () => {
      const ready = isMergedReady();
      if (ready && !wasReadyRef.current) {
        wasReadyRef.current = true;
        setCacheTick(t => t + 1);
      } else if (!ready) {
        wasReadyRef.current = false;
      }
      setTimeout(check, 200);
    };
    const id = setTimeout(check, 200);
    return () => clearTimeout(id);
  }, []);

  const questions = useMemo(() => {
    if (!selectedSubject || !selectedYear) return [];
    return getStudyQuestionsBySubject(selectedSubject, selectedYear, selectedCategory);
  }, [selectedSubject, selectedYear, selectedCategory, cacheTick]);

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
    questions, cacheTick,
    selectSubject, selectYear, selectCategory, reset,
  };
}
