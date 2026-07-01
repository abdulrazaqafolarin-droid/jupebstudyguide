import { useState, useCallback } from "react";
import type { TourPage, TourPageConfig, TourStep } from "@/types/feature-tour";
import { TOUR_CONFIGS } from "@/data/tour-steps";

const STORAGE_KEY = "rutex-feature-tour";

export const TOUR_PAGE_ORDER: TourPage[] = [
  "home",
  "past-questions",
  "syllabus",
  "chat",
  "leaderboard",
  "achievements",
  "discover",
  "ai-tutor",
  "profile",
];

interface StoredState {
  completedPages: string[];
  dismissed: boolean;
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedPages: [], dismissed: false };
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const PAGE_TOTAL = TOUR_PAGE_ORDER.length;

export function useFeatureTour(onNavigate?: (route: string) => void) {
  const [state, setState] = useState<StoredState>(loadState);
  const [active, setActive] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  const currentPage = TOUR_PAGE_ORDER[queueIdx];
  const currentPageConfig = TOUR_CONFIGS.find((c) => c.page === currentPage) ?? null;
  const currentStep = currentPageConfig?.steps[stepIdx] ?? null;
  const totalSteps = currentPageConfig?.steps.length ?? 0;
  const isLastPage = queueIdx >= PAGE_TOTAL - 1;
  const pagesCompleted = state.completedPages.length;

  const overallProgress = Math.round(
    ((queueIdx * 100 + (stepIdx / Math.max(totalSteps, 1)) * 100) / PAGE_TOTAL)
  );

  const markPageComplete = useCallback((page: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        completedPages: [...new Set([...prev.completedPages, page])],
      };
      saveState(next);
      return next;
    });
  }, []);

  const startTour = useCallback(() => {
    setActive(true);
    setQueueIdx(0);
    setStepIdx(0);
    const first = TOUR_CONFIGS[0];
    if (first && onNavigate) onNavigate(first.route);
  }, [onNavigate]);

  const stopTour = useCallback(() => {
    setActive(false);
    setQueueIdx(0);
    setStepIdx(0);
  }, []);

  function syncQueueAndNavigate(targetQueueIdx: number) {
    const page = TOUR_PAGE_ORDER[targetQueueIdx];
    const config = TOUR_CONFIGS.find((c) => c.page === page);
    setQueueIdx(targetQueueIdx);
    setStepIdx(0);
    if (config && onNavigate) onNavigate(config.route);
  }

  const nextStep = useCallback((): "step" | "page" | "complete" | undefined => {
    if (!currentPageConfig) return;
    if (stepIdx < currentPageConfig.steps.length - 1) {
      setStepIdx((i) => i + 1);
      return "step";
    }
    markPageComplete(currentPage);
    if (!isLastPage) {
      syncQueueAndNavigate(queueIdx + 1);
      return "page";
    } else {
      stopTour();
      return "complete";
    }
  }, [currentPageConfig, stepIdx, currentPage, isLastPage, queueIdx, markPageComplete, stopTour]);

  const prevStep = useCallback(() => {
    if (stepIdx > 0) {
      setStepIdx((i) => i - 1);
    } else if (queueIdx > 0) {
      const prevIdx = queueIdx - 1;
      const prevPage = TOUR_PAGE_ORDER[prevIdx];
      const prevConfig = TOUR_CONFIGS.find((c) => c.page === prevPage);
      setQueueIdx(prevIdx);
      setStepIdx(prevConfig ? prevConfig.steps.length - 1 : 0);
      if (prevConfig && onNavigate) onNavigate(prevConfig.route);
    }
  }, [stepIdx, queueIdx, onNavigate]);

  const skipTour = useCallback(() => {
    const nextState = { ...state, dismissed: true };
    setState(nextState);
    saveState(nextState);
    stopTour();
  }, [state, stopTour]);

  const resetTour = useCallback(() => {
    const nextState: StoredState = { completedPages: [], dismissed: false };
    setState(nextState);
    saveState(nextState);
  }, []);

  const isNewUser = state.completedPages.length === 0 && !state.dismissed;

  return {
    active,
    currentStep,
    stepIdx,
    totalSteps,
    currentPage,
    currentPageConfig,
    isNewUser,
    pagesCompleted,
    overallProgress,
    isLastPage,
    queueIdx,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    skipTour,
    resetTour,
    completedPages: state.completedPages,
  };
}
