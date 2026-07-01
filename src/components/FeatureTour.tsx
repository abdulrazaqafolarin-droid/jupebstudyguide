import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFeatureTour, TOUR_PAGE_ORDER } from "@/hooks/useFeatureTour";

const springSnap = { type: "spring" as const, stiffness: 450, damping: 30 };
const springBouncy = { type: "spring" as const, stiffness: 380, damping: 22 };

export default function FeatureTourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(false);
  const tour = useFeatureTour((route) => {
    if (route === "*") return;
    setPageLoading(true);
    navigate(route);
  });

  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const hasTriggeredWelcome = useRef(false);
  const retryCount = useRef(0);

  useEffect(() => {
    if (tour.isNewUser && !hasTriggeredWelcome.current) {
      hasTriggeredWelcome.current = true;
      const timer = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(timer);
    }
  }, [tour.isNewUser]);

  const stepId = tour.currentStep?.id ?? null;

  useEffect(() => {
    if (!tour.active || !stepId || pageLoading) {
      setSpotlightRect(null);
      retryCount.current = 0;
      return;
    }

    const fn = () => {
      const el = document.querySelector(tour.currentStep!.selector);
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
        retryCount.current = 0;
        return true;
      }
      return false;
    };

    if (!fn()) {
      setSpotlightRect(null);
      if (retryCount.current < 10) {
        retryCount.current++;
        const id = setTimeout(fn, 200);
        return () => clearTimeout(id);
      }
    }

    const el = document.querySelector(tour.currentStep!.selector);
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const e2 = document.querySelector(tour.currentStep!.selector);
      if (e2) setSpotlightRect(e2.getBoundingClientRect());
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tour.active, stepId, pageLoading]);

  useEffect(() => {
    if (!pageLoading) return;
    const check = setInterval(() => {
      const step = tour.currentStep;
      if (!step || step.placement === "center") {
        setPageLoading(false);
        clearInterval(check);
        return;
      }
      if (document.querySelector(step.selector)) {
        setPageLoading(false);
        clearInterval(check);
      }
    }, 150);
    const safety = setTimeout(() => {
      clearInterval(check);
      setPageLoading(false);
    }, 4000);
    return () => {
      clearInterval(check);
      clearTimeout(safety);
    };
  }, [pageLoading, stepId]);

  const handleNext = useCallback(() => {
    const result = tour.nextStep();
    if (result === "complete") setShowComplete(true);
  }, [tour]);

  const handleStart = useCallback(() => {
    setShowWelcome(false);
    tour.startTour();
  }, [tour]);

  return (
    <>
      {children}

      <AnimatePresence>
        {showWelcome && (
          <WelcomeOverlay
            onStart={handleStart}
            onDismiss={() => {
              setShowWelcome(false);
              tour.resetTour();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComplete && (
          <CompleteOverlay onDone={() => setShowComplete(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pageLoading && (
          <PageLoadingOverlay page={TOUR_PAGE_ORDER[tour.queueIdx]} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tour.active && tour.currentStep && !pageLoading && (
          <TourStepSheet
            stepIdx={tour.stepIdx}
            totalSteps={tour.totalSteps}
            pageConfig={tour.currentPageConfig}
            pageIdx={tour.queueIdx}
            totalPages={TOUR_PAGE_ORDER.length}
            spotlightRect={spotlightRect}
            showSpotlight={spotlightRect !== null && tour.currentStep.placement !== "center"}
            onNext={handleNext}
            onPrev={tour.prevStep}
            onSkip={tour.skipTour}
            onClose={tour.stopTour}
            canGoPrev={tour.stepIdx > 0 || tour.queueIdx > 0}
            isLastStep={tour.stepIdx >= tour.totalSteps - 1}
            isLastPage={tour.isLastPage}
            overallProgress={tour.overallProgress}
            stepKey={`${tour.queueIdx}-${tour.stepIdx}`}
          />
        )}
      </AnimatePresence>

      <TourFAB
        onActivate={() => {
          if (showWelcome) return;
          tour.startTour();
        }}
      />
    </>
  );
}

function PageLoadingOverlay({ page }: { page: string }) {
  const label =
    page === "home"
      ? "Dashboard"
      : page === "past-questions"
        ? "Past Questions"
        : page === "ai-tutor"
          ? "AI Tutor"
          : page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, " ");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading {label}...</p>
      </motion.div>
    </motion.div>
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
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 24, opacity: 0 }}
        transition={springBouncy}
        className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.08 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4"
        >
          <Compass className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h2
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="text-xl font-bold mb-2"
        >
          Welcome to Rutex Jupeb Master!
        </motion.h2>
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.16 }}
          className="text-sm text-muted-foreground mb-6 leading-relaxed"
        >
          Let us show you around. In just 90 seconds, you will know exactly how to use
          every feature — from past questions and the AI tutor to your study streak and
          leaderboard.
        </motion.p>
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-2"
        >
          <Button onClick={onStart} className="w-full group">
            Take the Tour
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="text-muted-foreground text-sm"
          >
            Skip, I will explore on my own
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function CompleteOverlay({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.85, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 24, opacity: 0 }}
        transition={springBouncy}
        className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 12, delay: 0.08 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center mx-auto mb-4"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h2
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="text-xl font-bold mb-2"
        >
          Tour Complete!
        </motion.h2>
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.16 }}
          className="text-sm text-muted-foreground mb-6 leading-relaxed"
        >
          You now know your way around. Start studying, track your progress, and climb
          the leaderboard. Your Rutex journey begins now!
        </motion.p>
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button onClick={onDone} className="w-full">
            Let's Go!
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function TourStepSheet({
  stepIdx,
  totalSteps,
  pageConfig,
  pageIdx,
  totalPages,
  spotlightRect,
  showSpotlight,
  onNext,
  onPrev,
  onSkip,
  onClose,
  canGoPrev,
  isLastStep,
  isLastPage,
  overallProgress,
  stepKey,
}: {
  stepIdx: number;
  totalSteps: number;
  pageConfig: TourPageConfig | null;
  pageIdx: number;
  totalPages: number;
  spotlightRect: DOMRect | null;
  showSpotlight: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  canGoPrev: boolean;
  isLastStep: boolean;
  isLastPage: boolean;
  overallProgress: number;
  stepKey: string;
}) {
  const step = pageConfig?.steps[stepIdx];
  if (!step) return null;

  const btnLabel = isLastStep && isLastPage ? "Finish" : isLastStep ? "Next Page" : "Next";

  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[9998]"
    >
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Spotlight cutout */}
      {showSpotlight && spotlightRect && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <mask id={`spot-${stepKey}`}>
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.x - 8}
                y={spotlightRect.y - 8}
                width={spotlightRect.width + 16}
                height={spotlightRect.height + 16}
                rx={14}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask={`url(#spot-${stepKey})`}
            style={{ pointerEvents: "auto" }}
          />
        </svg>
      )}

      {/* Pulse ring */}
      {showSpotlight && spotlightRect && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1.06, opacity: 0.4 }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="absolute border-2 border-primary rounded-xl pointer-events-none"
          style={{
            left: spotlightRect.x - 10,
            top: spotlightRect.y - 10,
            width: spotlightRect.width + 20,
            height: spotlightRect.height + 20,
            zIndex: 2,
          }}
        />
      )}

      {/* Bottom Sheet */}
      <motion.div
        key={stepKey}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="absolute bottom-0 left-0 right-0 z-10 bg-card border-t border-border rounded-t-2xl shadow-2xl"
        style={{ maxHeight: "55vh" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-5 overflow-y-auto">
          {/* Progress bar */}
          <div className="w-full h-1 bg-muted rounded-full mb-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {pageConfig?.icon && (
                <span className="text-lg">{pageConfig.icon}</span>
              )}
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Page {pageIdx + 1}/{totalPages}
              </span>
              <span className="text-[11px] text-muted-foreground/40">&middot;</span>
              <span className="text-[11px] text-muted-foreground">
                Step {stepIdx + 1}/{totalSteps}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Title & description */}
          <motion.div
            key={`content-${stepKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {step.description}
            </p>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.14 }}
            className="flex items-center justify-between gap-2"
          >
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
                Skip all
              </Button>
            </div>

            {/* Step dots */}
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i === stepIdx ? 1 : 0.85,
                    opacity: i === stepIdx ? 1 : 0.35,
                  }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    i === stepIdx ? "bg-primary" : "bg-muted-foreground/30",
                    i < stepIdx && "bg-primary/60",
                  )}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={onNext}
              className="h-8 text-xs group"
            >
              {isLastStep && isLastPage ? (
                "Finish"
              ) : isLastStep ? (
                <>
                  Next page
                  <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TourFAB({ onActivate }: { onActivate: () => void }) {
  const [tip, setTip] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 1 }}
      className="fixed bottom-20 right-4 z-[9997]"
      data-tour="tour-fab"
    >
      <AnimatePresence>
        {tip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={springSnap}
            className="absolute bottom-14 right-0 bg-card border border-border rounded-xl shadow-xl p-3 w-56"
          >
            <p className="text-xs text-muted-foreground">
              Take the feature tour to learn your way around the app.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onActivate}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center hover:shadow-xl hover:shadow-primary/40 transition-all"
      >
        <Compass className="w-5 h-5 text-white" />
      </motion.button>
    </motion.div>
  );
}
