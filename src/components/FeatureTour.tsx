import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFeatureTour } from "@/hooks/useFeatureTour";

const springCard = { type: "spring" as const, stiffness: 400, damping: 28 };
const springBouncy = { type: "spring" as const, stiffness: 380, damping: 22 };

interface TooltipPos {
  side: "top" | "bottom" | "left" | "right";
  top: number;
  left: number;
  transformOrigin: string;
}

function computeTooltipPos(
  rect: DOMRect,
  placement: string,
  tooltipW: number,
  tooltipH: number,
): TooltipPos {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const fitsAbove = rect.top - tooltipH - gap > 0;
  const fitsBelow = rect.bottom + tooltipH + gap < vh;
  const fitsLeft = rect.left - tooltipW - gap > 0;
  const fitsRight = rect.right + tooltipW + gap < vw;

  if (placement === "top" && fitsAbove) {
    return { side: "top", top: rect.top - tooltipH - gap, left: rect.left + rect.width / 2 - tooltipW / 2, transformOrigin: "bottom center" };
  }
  if (placement === "bottom" && fitsBelow) {
    return { side: "bottom", top: rect.bottom + gap, left: rect.left + rect.width / 2 - tooltipW / 2, transformOrigin: "top center" };
  }
  if (placement === "left" && fitsLeft) {
    return { side: "left", top: rect.top + rect.height / 2 - tooltipH / 2, left: rect.left - tooltipW - gap, transformOrigin: "right center" };
  }
  if (placement === "right" && fitsRight) {
    return { side: "right", top: rect.top + rect.height / 2 - tooltipH / 2, left: rect.right + gap, transformOrigin: "left center" };
  }

  if (rect.bottom + tooltipH + gap < vh) {
    return { side: "bottom", top: rect.bottom + gap, left: Math.max(8, Math.min(vw - tooltipW - 8, rect.left + rect.width / 2 - tooltipW / 2)), transformOrigin: "top center" };
  }
  if (rect.top - tooltipH - gap > 0) {
    return { side: "top", top: rect.top - tooltipH - gap, left: Math.max(8, Math.min(vw - tooltipW - 8, rect.left + rect.width / 2 - tooltipW / 2)), transformOrigin: "bottom center" };
  }
  return { side: "bottom", top: vh - tooltipH - 16, left: Math.max(8, Math.min(vw - tooltipW - 8, rect.left + rect.width / 2 - tooltipW / 2)), transformOrigin: "top center" };
}

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

  const { user } = useAuth();
  const location = useLocation();
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const hasLaunchedSession = useRef(false);
  const retryC = useRef(0);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  useEffect(() => {
    if (tour.isNewUser && user && location.pathname === "/" && !hasLaunchedSession.current) {
      hasLaunchedSession.current = true;
      const t = setTimeout(() => tour.startTour(), 1200);
      return () => clearTimeout(t);
    }
  }, [tour.isNewUser, user, location.pathname, tour]);

  const stepId = tour.current?.step.id ?? null;
  const prevStepRef = useRef(stepId);

  useEffect(() => {
    if (prevStepRef.current !== stepId && prevStepRef.current) {
      const steps = [/* just used for direction detection */];
      const prevIdx = tour.stepIdx;
      const curIdx = tour.stepIdx;
      setSlideDir(curIdx > (prevIdx !== undefined ? prevIdx : curIdx) ? 1 : -1);
    }
    prevStepRef.current = stepId;
  }, [stepId, tour.stepIdx]);

  useEffect(() => {
    if (!tour.active || !stepId || pageLoading) {
      setSpotlightRect(null);
      setTooltipPos(null);
      retryC.current = 0;
      return;
    }

    const tryFind = (): boolean => {
      const el = document.querySelector(tour.current!.step.selector);
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "center" });
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          setSpotlightRect(r);
          requestAnimationFrame(() => {
            if (cardRef.current) {
              const w = Math.min(380, window.innerWidth - 24);
              const h = cardRef.current.offsetHeight || 260;
              setTooltipPos(computeTooltipPos(r, tour.current!.step.placement, w, h));
            }
          });
        });
        retryC.current = 0;
        return true;
      }
      return false;
    };

    if (!tryFind()) {
      setSpotlightRect(null);
      if (retryC.current < 15) {
        retryC.current++;
        const id = setTimeout(tryFind, 200);
        return () => clearTimeout(id);
      }
    }

    const el = document.querySelector(tour.current!.step.selector);
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const e2 = document.querySelector(tour.current!.step.selector);
      if (!e2) return;
      const r = e2.getBoundingClientRect();
      setSpotlightRect(r);
      if (cardRef.current) {
        const w = Math.min(380, window.innerWidth - 24);
        const h = cardRef.current.offsetHeight || 260;
        setTooltipPos(computeTooltipPos(r, tour.current!.step.placement, w, h));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tour.active, stepId, pageLoading, tour.current]);

  useEffect(() => {
    if (cardRef.current && spotlightRect && tour.current) {
      const w = Math.min(380, window.innerWidth - 24);
      const h = cardRef.current.offsetHeight || 260;
      setTooltipPos(computeTooltipPos(spotlightRect, tour.current.step.placement, w, h));
    }
  }, [spotlightRect, tour.current]);

  useEffect(() => {
    if (!pageLoading) return;
    const check = setInterval(() => {
      const step = tour.current?.step;
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
    const safe = setTimeout(() => { clearInterval(check); setPageLoading(false); }, 4000);
    return () => { clearInterval(check); clearTimeout(safe); };
  }, [pageLoading, tour.current]);

  const handleNext = useCallback(() => {
    setSlideDir(1);
    const r = tour.nextStep();
    if (r === "complete") setShowComplete(true);
  }, [tour]);

  const handlePrev = useCallback(() => {
    setSlideDir(-1);
    tour.prevStep();
  }, [tour]);

  return (
    <>
      {children}

      <AnimatePresence>
        {showComplete && <CompleteOverlay onDone={() => setShowComplete(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {pageLoading && <PageLoadingOverlay page={tour.current?.pageConfig.title ?? ""} />}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {tour.active && tour.current && !pageLoading && (
          <TourStepCard
            key={`step-${tour.stepIdx}`}
            current={tour.current}
            stepIdx={tour.stepIdx}
            totalSteps={tour.totalSteps}
            spotlightRect={spotlightRect}
            tooltipPos={tooltipPos}
            showSpotlight={spotlightRect !== null && tour.current.step.placement !== "center"}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={tour.skipTour}
            onClose={tour.stopTour}
            isLastStep={tour.isLastStep}
            overallProgress={tour.overallProgress}
            slideDir={slideDir}
            cardRef={cardRef}
            onCardMeasure={() => {
              if (cardRef.current && spotlightRect && tour.current) {
                const w = Math.min(380, window.innerWidth - 24);
                const h = cardRef.current.offsetHeight || 260;
                requestAnimationFrame(() => {
                  setTooltipPos(computeTooltipPos(spotlightRect, tour.current!.step.placement, w, h));
                });
              }
            }}
          />
        )}
      </AnimatePresence>

      <TourFAB onActivate={tour.startTour} />
    </>
  );
}

function PageLoadingOverlay({ page }: { page: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">{page}...</p>
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
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/15 backdrop-blur-[2px] p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={springBouncy}
        className="bg-white dark:bg-gray-950 rounded-3xl max-w-sm w-full p-7 text-center shadow-2xl shadow-black/10 dark:shadow-black/50"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h2
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-lg font-semibold mb-2"
        >
          You're all set
        </motion.h2>
        <motion.p
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground/80 leading-relaxed mb-6"
        >
          Start studying, track your progress, and climb the leaderboard. Your JUPEB journey begins now!
        </motion.p>
        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Button onClick={onDone} className="w-full rounded-xl h-10 text-sm font-medium">
            Get Started
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const DOT = 3;
function StepDots({ total, current }: { total: number; current: number }) {
  const maxDots = 7;
  const half = Math.floor(maxDots / 2);
  const start = Math.max(0, current - half);
  const end = Math.min(total, start + maxDots);
  const dots: number[] = [];
  for (let i = start; i < end; i++) dots.push(i);
  const showLeft = start > 0;
  const showRight = end < total;

  return (
    <div className="flex items-center gap-[3px]">
      {showLeft && <span className="text-[8px] text-muted-foreground/25 leading-none">...</span>}
      {dots.map((i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 14 : DOT,
            opacity: i === current ? 1 : 0.2,
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="h-[3px] rounded-full bg-foreground"
        />
      ))}
      {showRight && <span className="text-[8px] text-muted-foreground/25 leading-none">...</span>}
    </div>
  );
}

function TourStepCard({
  current,
  stepIdx,
  totalSteps,
  spotlightRect,
  tooltipPos,
  showSpotlight,
  onNext,
  onPrev,
  onSkip,
  onClose,
  isLastStep,
  overallProgress,
  slideDir,
  cardRef,
  onCardMeasure,
}: {
  current: { step: { id: string; title: string; description: string; benefit: string; selector: string; placement: string }; pageConfig: { title: string; icon?: string }; stepIndex: number; pageIndex: number };
  stepIdx: number;
  totalSteps: number;
  spotlightRect: DOMRect | null;
  tooltipPos: TooltipPos | null;
  showSpotlight: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  isLastStep: boolean;
  overallProgress: number;
  slideDir: 1 | -1;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onCardMeasure: () => void;
}) {
  const { step, pageConfig } = current;
  const isCenter = step.placement === "center";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9998]"
    >
      {/* 4-panel dim backdrop */}
      {showSpotlight && spotlightRect && !isCenter ? (
        <>
          <div className="absolute bg-black/15 backdrop-blur-[1px] cursor-pointer" onClick={onClose} style={{ zIndex: 1, top: 0, left: 0, right: 0, height: Math.max(0, spotlightRect.top - 10) }} />
          <div className="absolute bg-black/15 backdrop-blur-[1px] cursor-pointer" onClick={onClose} style={{ zIndex: 1, top: Math.max(0, spotlightRect.bottom + 10), left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/15 backdrop-blur-[1px] cursor-pointer" onClick={onClose} style={{ zIndex: 1, top: Math.max(0, spotlightRect.top - 10), left: 0, width: Math.max(0, spotlightRect.left - 10), height: spotlightRect.height + 20 }} />
          <div className="absolute bg-black/15 backdrop-blur-[1px] cursor-pointer" onClick={onClose} style={{ zIndex: 1, top: Math.max(0, spotlightRect.top - 10), right: 0, left: spotlightRect.right + 10, height: spotlightRect.height + 20 }} />
        </>
      ) : !isCenter ? (
        <div className="absolute inset-0 bg-black/15" onClick={onClose} style={{ zIndex: 1 }} />
      ) : null}

      {/* Pulse ring */}
      {showSpotlight && spotlightRect && !isCenter && (
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1.04, opacity: 0.4 }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute rounded-2xl pointer-events-none"
          style={{
            left: spotlightRect.x - 14,
            top: spotlightRect.y - 14,
            width: spotlightRect.width + 28,
            height: spotlightRect.height + 28,
            zIndex: 2,
            border: "1.5px solid",
            borderColor: "hsl(var(--primary))",
          }}
        />
      )}

      {/* Tooltip card */}
      {isMobile || isCenter ? (
        <motion.div
          layout
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={springCard}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-950 rounded-t-3xl shadow-2xl shadow-black/10 dark:shadow-black/50"
          style={{ maxHeight: "60vh" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-[3px] rounded-full bg-foreground/10" />
          </div>
          <CardBody
            step={step}
            pageConfig={pageConfig}
            stepIdx={stepIdx}
            totalSteps={totalSteps}
            overallProgress={overallProgress}
            isLastStep={isLastStep}
            slideDir={slideDir}
            onNext={onNext}
            onPrev={onPrev}
            onSkip={onSkip}
            onClose={onClose}
            ref={cardRef}
            onMeasure={onCardMeasure}
          />
        </motion.div>
      ) : (
        <motion.div
          ref={cardRef}
          layout
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            top: tooltipPos?.top ?? 0,
            left: tooltipPos?.left ?? 0,
          }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="fixed bg-white dark:bg-gray-950 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 border border-gray-200 dark:border-gray-800"
          style={{
            width: Math.min(360, (typeof window !== "undefined" ? window.innerWidth : 360) - 24),
            transformOrigin: tooltipPos?.transformOrigin ?? "top center",
          }}
        >
          <CardBody
            step={step}
            pageConfig={pageConfig}
            stepIdx={stepIdx}
            totalSteps={totalSteps}
            overallProgress={overallProgress}
            isLastStep={isLastStep}
            slideDir={slideDir}
            onNext={onNext}
            onPrev={onPrev}
            onSkip={onSkip}
            onClose={onClose}
            ref={cardRef}
            onMeasure={onCardMeasure}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

const CardBody = forwardRef(function CardBody({
  step,
  pageConfig,
  stepIdx,
  totalSteps,
  overallProgress,
  isLastStep,
  slideDir,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onMeasure,
}: {
  step: { id: string; title: string; description: string; benefit: string; selector: string; placement: string };
  pageConfig: { title: string; icon?: string };
  stepIdx: number;
  totalSteps: number;
  overallProgress: number;
  isLastStep: boolean;
  slideDir: 1 | -1;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onMeasure: () => void;
}, ref: React.ForwardedRef<HTMLDivElement>) {
  useEffect(() => { onMeasure(); }, [onMeasure, step.id]);

  return (
    <div ref={ref} className="px-5 pb-5 pt-1 overflow-y-auto">
      {/* Progress bar — thin, subtle */}
      <div className="w-full h-[2px] bg-foreground/[0.06] rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {pageConfig.icon && <span className="text-sm">{pageConfig.icon}</span>}
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-[0.08em]">
            {pageConfig.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/35 tabular-nums">
            {String(stepIdx + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
          </span>
          <button onClick={onClose} className="p-0.5 rounded-md hover:bg-secondary transition-colors">
            <X className="w-3 h-3 text-muted-foreground/40" />
          </button>
        </div>
      </div>

      {/* Animated content */}
      <AnimatePresence mode="popLayout" custom={slideDir}>
        <motion.div
          key={step.id}
          custom={slideDir}
          initial={{ opacity: 0, x: slideDir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: slideDir * -24 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          <h3 className="font-semibold text-sm mb-1.5 leading-snug">{step.title}</h3>
          <p className="text-[13px] text-muted-foreground/75 leading-relaxed mb-3">
            {step.description}
          </p>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/[0.04] border border-primary/[0.06] mb-4">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[13px] text-foreground/65 leading-relaxed">{step.benefit}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={stepIdx === 0}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-secondary disabled:opacity-15 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={onSkip} className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground/35 hover:text-muted-foreground hover:bg-secondary transition-colors">
            Skip
          </button>
        </div>

        <StepDots total={totalSteps} current={stepIdx} />

        <button
          onClick={onNext}
          className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-1"
        >
          {isLastStep ? "Done" : (
            <>
              Next
              <ChevronRight className="w-3 h-3" />
            </>
          )}
        </button>
      </div>
    </div>
  );
});

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
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="absolute bottom-14 right-0 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl shadow-black/10 p-3 w-56"
          >
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Take the tour to learn your way around.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onActivate}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        className="relative w-11 h-11 rounded-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg shadow-black/10 dark:shadow-black/30 flex items-center justify-center hover:shadow-xl transition-all"
      >
        <Compass className="w-5 h-5 text-primary" />
      </motion.button>
    </motion.div>
  );
}
