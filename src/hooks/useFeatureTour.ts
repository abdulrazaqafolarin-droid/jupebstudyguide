import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { TourPage, TourPageConfig, TourStep } from "@/types/feature-tour";
import { TOUR_CONFIGS } from "@/data/tour-steps";

const STORAGE_KEY = "jupeb-feature-tour";

interface StoredState {
  completedPages: string[];
  dismissed: boolean;
  dismissedPages: string[];
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedPages: [], dismissed: false, dismissedPages: [] };
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useFeatureTour() {
  const location = useLocation();
  const [state, setState] = useState<StoredState>(loadState);
  const [active, setActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPageConfig, setCurrentPageConfig] = useState<TourPageConfig | null>(null);

  const currentPage = getPageForRoute(location.pathname);

  useEffect(() => {
    if (!active) return;
    const config = TOUR_CONFIGS.find((c) => c.page === currentPage);
    if (config && !state.dismissedPages.includes(config.page)) {
      setCurrentPageConfig(config);
      setCurrentStepIndex(0);
    } else {
      setActive(false);
    }
  }, [location.pathname, active, state.dismissedPages, currentPage]);

  const startTour = useCallback(() => {
    setActive(true);
    setCurrentStepIndex(0);
    const config = TOUR_CONFIGS.find((c) => c.page === currentPage);
    setCurrentPageConfig(config ?? null);
  }, [currentPage]);

  const stopTour = useCallback(() => {
    setActive(false);
    setCurrentStepIndex(0);
    setCurrentPageConfig(null);
  }, []);

  const nextStep = useCallback(() => {
    if (!currentPageConfig) return;
    if (currentStepIndex < currentPageConfig.steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
      scrollToStep(currentPageConfig.steps[currentStepIndex + 1]);
    } else {
      completePage(currentPageConfig.page);
    }
  }, [currentPageConfig, currentStepIndex, currentPage]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const skipPage = useCallback(() => {
    if (!currentPageConfig) return;
    const newState = {
      ...state,
      dismissedPages: [...new Set([...state.dismissedPages, currentPageConfig.page])],
    };
    setState(newState);
    saveState(newState);
    setActive(false);
    setCurrentStepIndex(0);
    setCurrentPageConfig(null);
  }, [currentPageConfig, state]);

  const completePage = useCallback(
    (page: TourPage) => {
      const newCompleted = [...new Set([...state.completedPages, page])];
      const newState = {
        ...state,
        completedPages: newCompleted,
        dismissedPages: [...new Set([...state.dismissedPages, page])],
      };
      setState(newState);
      saveState(newState);
      setActive(false);
      setCurrentStepIndex(0);
      setCurrentPageConfig(null);
    },
    [state],
  );

  const resetTour = useCallback(() => {
    const newState: StoredState = { completedPages: [], dismissed: false, dismissedPages: [] };
    setState(newState);
    saveState(newState);
    setActive(false);
  }, []);

  const currentStep: TourStep | null =
    currentPageConfig?.steps[currentStepIndex] ?? null;

  const totalSteps = currentPageConfig?.steps.length ?? 0;

  const isNewUser = state.completedPages.length === 0 && !state.dismissed;

  return {
    active,
    currentStep,
    currentStepIndex,
    totalSteps,
    currentPage,
    currentPageConfig,
    isNewUser,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    skipPage,
    completePage,
    resetTour,
    completedPages: state.completedPages,
    hasPageBeenSeen: (page: TourPage) =>
      state.completedPages.includes(page) || state.dismissedPages.includes(page),
  };
}

function getPageForRoute(pathname: string): TourPage {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/past-questions")) return "past-questions";
  if (pathname.startsWith("/syllabus")) return "syllabus";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/achievements")) return "achievements";
  if (pathname.startsWith("/discover")) return "discover";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

function scrollToStep(step: TourStep) {
  if (step.placement === "center") return;
  const el = document.querySelector(step.selector);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
