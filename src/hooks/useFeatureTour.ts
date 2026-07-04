import { useState, useCallback, useMemo } from "react";
import type { TourPage, TourStep, TourPageConfig } from "@/types/feature-tour";
import { TOUR_CONFIGS } from "@/data/tour-steps";

const STORAGE_KEY = "rutex-feature-tour-v2";

interface StoredState {
  currentStep: number;
  completed: boolean;
  dismissed: boolean;
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { currentStep: 0, completed: false, dismissed: false };
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const TOUR_PAGE_ORDER: TourPage[] = TOUR_CONFIGS.map((c) => c.page);

interface FlatStep {
  step: TourStep;
  pageConfig: TourPageConfig;
  stepIndex: number;
  pageIndex: number;
}

export function buildFlatSteps(): FlatStep[] {
  const result: FlatStep[] = [];
  for (let pi = 0; pi < TOUR_CONFIGS.length; pi++) {
    const config = TOUR_CONFIGS[pi];
    for (let si = 0; si < config.steps.length; si++) {
      result.push({
        step: config.steps[si],
        pageConfig: config,
        stepIndex: si,
        pageIndex: pi,
      });
    }
  }
  return result;
}

export const FLAT_STEPS = buildFlatSteps();
export const TOTAL_STEPS = FLAT_STEPS.length;

export function useFeatureTour(onNavigate?: (route: string) => void) {
  const [state, setState] = useState<StoredState>(loadState);
  const [active, setActive] = useState(false);

  const stepIdx = active ? state.currentStep : 0;
  const current = FLAT_STEPS[stepIdx] ?? null;
  const totalSteps = TOTAL_STEPS;
  const isNewUser = !state.completed && !state.dismissed;

  const overallProgress = totalSteps > 0
    ? Math.round((stepIdx / totalSteps) * 100)
    : 0;

  const isLastStep = stepIdx >= totalSteps - 1;

  const updateState = useCallback((partial: Partial<StoredState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      saveState(next);
      return next;
    });
  }, []);

  const startTour = useCallback(() => {
    updateState({ currentStep: 0, completed: false });
    setActive(true);
    const first = FLAT_STEPS[0];
    if (first && first.pageConfig.route !== "*" && onNavigate) {
      onNavigate(first.pageConfig.route);
    }
  }, [onNavigate, updateState]);

  const stopTour = useCallback(() => {
    setActive(false);
  }, []);

  const navigateToStep = useCallback((targetIdx: number) => {
    const target = FLAT_STEPS[targetIdx];
    if (!target) return;
    updateState({ currentStep: targetIdx });
    const route = target.step.route ?? target.pageConfig.route;
    if (route !== "*" && onNavigate) {
      onNavigate(route);
    }
  }, [onNavigate, updateState]);

  const nextStep = useCallback((): "step" | "complete" | undefined => {
    if (isLastStep) {
      updateState({ completed: true });
      stopTour();
      return "complete";
    }
    const nextIdx = stepIdx + 1;
    navigateToStep(nextIdx);
    return "step";
  }, [isLastStep, stepIdx, navigateToStep, updateState, stopTour]);

  const prevStep = useCallback(() => {
    if (stepIdx > 0) {
      navigateToStep(stepIdx - 1);
    }
  }, [stepIdx, navigateToStep]);

  const skipTour = useCallback(() => {
    updateState({ dismissed: true });
    stopTour();
  }, [updateState, stopTour]);

  const resetTour = useCallback(() => {
    setState({ currentStep: 0, completed: false, dismissed: false });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    active,
    current,
    stepIdx,
    totalSteps,
    overallProgress,
    isNewUser,
    isLastStep,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    skipTour,
    resetTour,
  };
}
