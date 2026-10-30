import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { StepWelcome } from '@/components/onboarding/StepWelcome';
import { StepTheme } from '@/components/onboarding/StepTheme';
import { StepStudySetup } from '@/components/onboarding/StepStudySetup';
import { StepChatPrivacy } from '@/components/onboarding/StepChatPrivacy';
import { StepNotifications } from '@/components/onboarding/StepNotifications';
import { StepFinish } from '@/components/onboarding/StepFinish';
import { useOnboarding } from '@/hooks/useOnboarding';
import { usePushNotificationsContext } from '@/contexts/PushNotificationsContext';
import { useUserStorage } from '@/hooks/useUserStorage';
import { firstIncompleteStep, privacyValueFromToggle, type OnboardingStepId } from '@/lib/onboarding';
import type { Subject } from '@/types/question';
import { Loader2 } from 'lucide-react';

const STEP_CTA: Record<OnboardingStepId, string> = {
  welcome: "Let's go",
  theme: 'Continue',
  study: 'Continue',
  chat: 'Continue',
  notify: 'Turn on reminders',
  finish: 'Start my first mission',
};

/**
 * The onboarding orchestrator. One decision per screen; every "Next" persists
 * that step (one request) before advancing, and a failed save toasts once but
 * never traps the student. Skip leaves the flow marked as seen — the home
 * page nudge offers resuming, and /onboarding stays reachable until the tour
 * is finalized.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { theme, setTheme } = useTheme();
  const { subscribe, permission, isSubscribed } = usePushNotificationsContext();
  const { loading, flow, data, displayName, isReplay, saveStep, complete } = useOnboarding();
  const [, setStoredElectives] = useUserStorage<string[]>('onboarding-subjects', []);
  const [, setStoredDailyGoal] = useUserStorage<number>('onboarding-daily-goal', 30);

  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [requesting, setRequesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Draft choices. Theme follows the live global theme unless the student
  // explicitly picks one this session — so a profile-restored preference on
  // a fresh device is never clobbered by a stale mount-time snapshot.
  const [userPickedTheme, setUserPickedTheme] = useState<'dark' | 'light' | null>(null);
  const effectiveTheme: 'dark' | 'light' =
    userPickedTheme ?? (theme === 'light' || theme === 'dark' ? theme : 'dark');
  const [electives, setElectives] = useState<Subject[]>([]);
  const [examTarget, setExamTarget] = useState('this-session');
  const [dailyGoal, setDailyGoal] = useState(30);
  const [chatOnline, setChatOnline] = useState(true);
  const [chatReceipts, setChatReceipts] = useState(true);
  const [chatDiscover, setChatDiscover] = useState(true);

  // Seed once the profile row lands: resume/replay must restore saved
  // choices, and the starting step must be the first incomplete one (the
  // initial state ran while flow was still empty).
  const seededRef = useRef(false);
  useEffect(() => {
    if (loading || flow.length === 0 || seededRef.current) return;
    seededRef.current = true;
    const target = isReplay ? flow[0] : firstIncompleteStep(flow, data.completedSteps ?? []);
    setStepIdx(Math.max(0, flow.indexOf(target)));
    setElectives((data.subjects ?? []).filter((s): s is Subject => s === 'biology' || s === 'math'));
    setExamTarget(data.examTarget ?? 'this-session');
    setDailyGoal(data.dailyGoalMinutes ?? 30);
    setChatOnline(data.chat?.online ?? true);
    setChatReceipts(data.chat?.receipts ?? true);
    setChatDiscover(data.chat?.discover ?? true);
  }, [loading, flow, data, isReplay]);

  const step = flow[stepIdx];
  const goHome = useCallback(() => navigate('/', { replace: true }), [navigate]);

  const advance = useCallback(() => {
    setDir(1);
    setStepIdx((i) => Math.min(i + 1, flow.length - 1));
  }, [flow.length]);

  const handleBack = useCallback(() => {
    setDir(-1);
    setStepIdx((i) => Math.max(i - 1, 0));
  }, []);

  /** Persist current step, then advance. Failures toast once but never block. */
  const persistAndAdvance = useCallback(
    async (stepId: OnboardingStepId, patch: Parameters<typeof saveStep>[1] = {}, extra: Record<string, unknown> = {}) => {
      setSaving(true);
      const ok = await saveStep(stepId, patch, extra);
      setSaving(false);
      if (!ok) toast.error("Couldn't save that — you can change it in Settings later.");
      advance();
    },
    [saveStep, advance],
  );

  const handleCta = useCallback(async () => {
    if (!step || saving) return;
    switch (step) {
      case 'welcome':
        await persistAndAdvance('welcome');
        break;
      case 'theme':
        await persistAndAdvance('theme', {}, { theme_preference: effectiveTheme });
        break;
      case 'study': {
        const subjects = ['physics', 'chemistry', ...electives];
        setStoredElectives(electives);
        setStoredDailyGoal(dailyGoal);
        await persistAndAdvance('study', { subjects, examTarget, dailyGoalMinutes: dailyGoal });
        break;
      }
      case 'chat': {
        const extra = {
          privacy_online_status: privacyValueFromToggle(chatOnline),
          privacy_read_receipts: privacyValueFromToggle(chatReceipts),
          privacy_activity_status: privacyValueFromToggle(chatDiscover),
        };
        const ok = await saveStep('chat', { chat: { online: chatOnline, receipts: chatReceipts, discover: chatDiscover } }, extra);
        if (!ok) toast.error("Couldn't save your chat settings — update them in Settings.");
        advance();
        break;
      }
      case 'notify': {
        if (permission !== 'granted' && !isSubscribed) {
          setRequesting(true);
          try {
            await subscribe();
          } catch {
            toast.error("Couldn't enable reminders — allow notifications in your browser settings.");
          }
          setRequesting(false);
        }
        await persistAndAdvance('notify');
        break;
      }
      case 'finish': {
        setSaving(true);
        const ok = await complete(true);
        setSaving(false);
        if (!ok) toast.error("Couldn't save that — showing your setup anyway.");
        goHome();
        break;
      }
    }
  }, [step, saving, persistAndAdvance, saveStep, advance, effectiveTheme, electives, dailyGoal, examTarget, chatOnline, chatReceipts, chatDiscover, permission, isSubscribed, subscribe, complete, goHome, setStoredElectives, setStoredDailyGoal]);

  const handleSkip = useCallback(async () => {
    await complete(false);
    toast.success('Setup saved — finish it anytime from your home page.');
    goHome();
  }, [complete, goHome]);

  const handleBrowseClassmates = useCallback(async () => {
    await complete(false);
    navigate('/discover');
  }, [complete, navigate]);

  if (loading || !step) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const notificationsGranted = permission === 'granted' || isSubscribed;
  const ctaLabel =
    step === 'notify' && notificationsGranted ? 'Continue' : STEP_CTA[step];

  return (
    <OnboardingShell
      stepIndex={stepIdx}
      stepCount={flow.length}
      ctaLabel={ctaLabel}
      ctaDisabled={saving || requesting}
      onCta={handleCta}
      onBack={stepIdx > 0 && !isReplay ? handleBack : undefined}
      onSkip={step === 'finish' ? undefined : handleSkip}
      secondary={
        step === 'notify' && !notificationsGranted ? (
          <div className="text-center">
            <button
              onClick={() => persistAndAdvance('notify')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
          </div>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: `translateX(${dir * 40}px)` }}
          animate={{ opacity: 1, transform: 'translateX(0px)' }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          {step === 'welcome' && <StepWelcome displayName={displayName} />}
          {step === 'theme' && (
            <StepTheme
              selected={effectiveTheme}
              onSelect={(t) => {
                setUserPickedTheme(t);
                setTheme(t);
              }}
            />
          )}
          {step === 'study' && (
            <StepStudySetup
              electives={electives}
              examTarget={examTarget}
              dailyGoalMinutes={dailyGoal}
              onToggleElective={(s) =>
                setElectives((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
              }
              onExamTarget={setExamTarget}
              onDailyGoal={setDailyGoal}
            />
          )}
          {step === 'chat' && (
            <StepChatPrivacy
              online={chatOnline}
              receipts={chatReceipts}
              discover={chatDiscover}
              onOnlineChange={setChatOnline}
              onReceiptsChange={setChatReceipts}
              onDiscoverChange={setChatDiscover}
              onBrowseClassmates={handleBrowseClassmates}
            />
          )}
          {step === 'notify' && (
            <StepNotifications
              granted={notificationsGranted}
              requesting={requesting}
              onRequest={handleCta}
            />
          )}
          {step === 'finish' && (
            <StepFinish
              displayName={displayName}
              theme={effectiveTheme}
              subjectCount={2 + electives.length}
              chatEnabled={chatOnline || chatReceipts || chatDiscover}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  );
}
