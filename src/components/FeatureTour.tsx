import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, SkipForward, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TourPageConfig, TourStep } from "@/types/feature-tour";
import { useFeatureTour } from "@/hooks/useFeatureTour";

export default function FeatureTourProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const tour = useFeatureTour();
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const hasTriggeredWelcome = useRef(false);

  useEffect(() => {
    if (tour.isNewUser && !hasTriggeredWelcome.current) {
      hasTriggeredWelcome.current = true;
      const timer = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(timer);
    }
  }, [tour.isNewUser]);

  useEffect(() => {
    if (!tour.active || !tour.currentStep) {
      setSpotlightRect(null);
      return;
    }
    if (tour.currentStep.placement === "center") {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(tour.currentStep.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
    const observer = new ResizeObserver(() => {
      const e2 = document.querySelector(tour.currentStep.selector);
      if (e2) setSpotlightRect(e2.getBoundingClientRect());
    });
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [tour.active, tour.currentStep]);

  const handleNavigate = useCallback(
    (to: string) => {
      navigate(to);
    },
    [navigate],
  );

  return (
    <>
      {children}

      <AnimatePresence>
        {showWelcome && (
          <WelcomeOverlay
            onStart={() => {
              setShowWelcome(false);
              setTimeout(() => tour.startTour(), 300);
            }}
            onDismiss={() => {
              setShowWelcome(false);
              tour.resetTour();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tour.active && tour.currentStep && (
          <TourOverlay
            currentStep={tour.currentStep}
            currentStepIndex={tour.currentStepIndex}
            totalSteps={tour.totalSteps}
            currentPageConfig={tour.currentPageConfig}
            spotlightRect={spotlightRect}
            onNext={tour.nextStep}
            onPrev={tour.prevStep}
            onSkip={tour.skipPage}
            onClose={tour.stopTour}
            canGoPrev={tour.currentStepIndex > 0}
            canGoNext={tour.currentStepIndex < tour.totalSteps - 1}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>

      <TourFAB
        unseenCount={
          tour.completedPages.length < 9 ? 9 - tour.completedPages.length : 0
        }
        onActivate={() => {
          if (showWelcome) return;
          tour.startTour();
        }}
        hasSeenAll={tour.completedPages.length >= 9}
      />
    </>
  );
}

function WelcomeOverlay({
  onStart,
  onDismiss,
}: {
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Welcome to JUPEB Study Guide!</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Let us show you around. In 2 minutes, you will know exactly how to use every
          feature — from past questions and the AI tutor to your study streak and leaderboard.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={onStart} className="w-full">
            Take the Tour
          </Button>
          <Button variant="ghost" onClick={onDismiss} className="text-muted-foreground text-sm">
            Skip, I will explore on my own
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TourOverlay({
  currentStep,
  currentStepIndex,
  totalSteps,
  currentPageConfig,
  spotlightRect,
  onNext,
  onPrev,
  onSkip,
  onClose,
  canGoPrev,
  canGoNext,
  onNavigate,
}: {
  currentStep: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  currentPageConfig: TourPageConfig | null;
  spotlightRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  onNavigate: (to: string) => void;
}) {
  const isCenter = currentStep.placement === "center";

  const tooltipX = spotlightRect
    ? spotlightRect.left + spotlightRect.width / 2
    : window.innerWidth / 2;
  const tooltipY = spotlightRect
    ? currentStep.placement === "bottom"
      ? spotlightRect.bottom + 12
      : currentStep.placement === "top"
        ? spotlightRect.top - 12
        : spotlightRect.top + spotlightRect.height / 2
    : window.innerHeight / 2;

  const tooltipPlacement = currentStep.placement === "center" ? "center" : currentStep.placement;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998]"
    >
      {!isCenter && spotlightRect && (
        <>
          {/* Dark overlay with spotlight cutout */}
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightRect.x - 4}
                  y={spotlightRect.y - 4}
                  width={spotlightRect.width + 8}
                  height={spotlightRect.height + 8}
                  rx={12}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.65)"
              mask="url(#spotlight-mask)"
              style={{ pointerEvents: "auto" }}
              onClick={onClose}
            />
          </svg>

          {/* Pulse ring */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="absolute border-2 border-primary rounded-xl pointer-events-none"
            style={{
              left: spotlightRect.x - 6,
              top: spotlightRect.y - 6,
              width: spotlightRect.width + 12,
              height: spotlightRect.height + 12,
            }}
          />
        </>
      )}

      {isCenter && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Tooltip / Popover */}
      <div
        className={cn(
          "absolute z-10 w-[calc(100%-2rem)] max-w-sm",
          tooltipPlacement === "center" &&
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          tooltipPlacement === "bottom" && "-translate-x-1/2",
          tooltipPlacement === "top" && "-translate-x-1/2 -translate-y-full",
        )}
        style={
          tooltipPlacement !== "center"
            ? {
                left: tooltipX,
                top: tooltipPlacement === "bottom"
                  ? tooltipY
                  : tooltipPlacement === "top"
                    ? tooltipY
                    : tooltipY,
              }
            : undefined
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="bg-card border border-border rounded-xl shadow-2xl p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {currentPageConfig?.title} &middot; {currentStepIndex + 1}/{totalSteps}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Title & Desc */}
          <h3 className="font-semibold text-sm mb-1">{currentStep.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            {currentStep.description}
          </p>

          {/* Action / Navigation link */}
          {currentStep.action && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-3 text-xs"
              onClick={() => onNavigate(currentStep.action!.to)}
            >
              {currentStep.action.label}
            </Button>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                disabled={!canGoPrev}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="h-8 text-xs text-muted-foreground"
              >
                <SkipForward className="w-3 h-3 mr-1" />
                Skip
              </Button>
            </div>

            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === currentStepIndex
                      ? "bg-primary w-3"
                      : "bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>

            <Button size="sm" onClick={onNext} className="h-8 text-xs">
              {canGoNext ? (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                "Done"
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TourFAB({
  unseenCount,
  onActivate,
  hasSeenAll,
}: {
  unseenCount: number;
  onActivate: () => void;
  hasSeenAll: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="fixed bottom-20 right-4 z-[9997]"
      data-tour="tour-fab"
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            className="absolute bottom-14 right-0 bg-card border border-border rounded-xl shadow-xl p-3 w-56"
          >
            <p className="text-xs text-muted-foreground">
              {hasSeenAll
                ? "Revisit any feature tour anytime."
                : `${unseenCount} feature tour${unseenCount !== 1 ? "s" : ""} available`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onActivate}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
      >
        <Compass className="w-5 h-5 text-white" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
            {unseenCount}
          </span>
        )}
      </button>
    </div>
  );
}
