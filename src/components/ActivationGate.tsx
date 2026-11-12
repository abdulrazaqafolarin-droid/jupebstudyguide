import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useActivation } from "@/hooks/useActivation";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_EMAIL } from "@/lib/adminEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Key, CheckCircle, Loader2, AlertCircle, LogOut, Mail, MessageCircle, DollarSign, Clock } from "lucide-react";
import rutexLogo from "@/assets/rutex-logo.jpg";
import { toast } from "sonner";
import { formatTrialCountdown } from "@/lib/trial-countdown";

interface ActivationGateProps {
  children: React.ReactNode;
}

export const ActivationGate = ({ children }: ActivationGateProps) => {
  const { status, validateCode, validating, error, refreshStatus } = useActivation();
  const { user, signOut } = useAuth();
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [showActivationEntry, setShowActivationEntry] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const subscriptionExpiresAt = status.subscription_expires_at ? Date.parse(status.subscription_expires_at) : Number.NaN;
  const trialExpiresAt = status.trial_expires_at ? Date.parse(status.trial_expires_at) : Number.NaN;

  useEffect(() => {
    const hasTimedAccess =
      (Number.isFinite(subscriptionExpiresAt) && subscriptionExpiresAt > Date.now()) ||
      (Number.isFinite(trialExpiresAt) && trialExpiresAt > Date.now());
    if (!hasTimedAccess) return;

    const tick = () => setClockNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [subscriptionExpiresAt, trialExpiresAt]);

  const subscriptionActive = Number.isFinite(subscriptionExpiresAt) && subscriptionExpiresAt > clockNow;
  const trialActive = Number.isFinite(trialExpiresAt) && trialExpiresAt > clockNow;
  const activeExpiry = subscriptionActive ? subscriptionExpiresAt : trialExpiresAt;

  const handleTrialActivation = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = activationCode.trim().toUpperCase();
    if (normalized.length !== 14 || validating) return;

    const result = await validateCode(normalized);
    if (result.success) {
      setActivationCode("");
      setShowActivationEntry(false);
      await refreshStatus();
      toast.success(`Subscription extended by ${result.duration_days ?? "the purchased"} days.`);
    }
  }, [activationCode, validating, validateCode, refreshStatus]);

  if (status.checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (status.check_error && !status.is_admin && !subscriptionActive && !trialActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-9 w-9 text-muted-foreground" />
            <CardTitle>Couldn't verify your account</CardTitle>
            <CardDescription>
              The activation service could not be reached. This does not mean your account is inactive, and your saved study data has not been changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => { void refreshStatus(); }}
              disabled={status.checking}
            >
              {status.checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {status.checking ? "Checking…" : "Retry verification"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { void signOut(); }}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.is_admin || subscriptionActive || trialActive) {
    return (
      <div className="activation-gate-shell min-h-[100dvh] w-full bg-background">
        <AnimatePresence initial={false}>
          {(subscriptionActive || trialActive) && !status.is_admin && (
            <motion.div
              key="subscription-status-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
                opacity: { duration: 0.16, ease: "easeOut" },
              }}
              className="w-full overflow-hidden"
            >
              <div
                role="group"
                aria-label="Subscription status"
                aria-live="off"
                className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-center text-xs text-primary"
              >
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <strong>{subscriptionActive ? `${status.subscription_duration_days ?? "Paid"}-day subscription active` : "1-day free trial active"}</strong>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums" aria-live="off">
                    {formatTrialCountdown(activeExpiry - clockNow)} remaining
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="ml-1 h-7 shrink-0 px-3 text-xs"
                    onClick={() => setShowActivationEntry((open) => !open)}
                    aria-expanded={showActivationEntry}
                    aria-controls="trial-activation-entry"
                  >
                    <Key className="mr-1.5 h-3 w-3" />
                    Enter Code
                  </Button>
                </div>
              </div>
              {showActivationEntry && (
                <div id="trial-activation-entry" className="border-b border-primary/20 bg-card px-4 py-3">
                  <form onSubmit={handleTrialActivation} className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1">
                      <label htmlFor="trial-activation-code" className="text-xs font-medium text-foreground">
                        Enter your activation code
                      </label>
                      <Input
                        id="trial-activation-code"
                        value={activationCode}
                        onChange={(event) => setActivationCode(event.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX-XXXX"
                        maxLength={14}
                        autoComplete="off"
                        disabled={validating}
                        className="h-10 font-mono tracking-widest uppercase"
                      />
                      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="submit" size="sm" className="h-10" disabled={activationCode.trim().length !== 14 || validating}>
                        {validating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Key className="mr-1.5 h-4 w-4" />}
                        {validating ? "Checking…" : "Activate Now"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-10" onClick={() => setShowActivationEntry(false)}>
                        Later
                      </Button>
                    </div>
                  </form>
                  <p className="mx-auto mt-2 max-w-2xl text-[11px] text-muted-foreground">
                    {subscriptionActive
                      ? "Your current paid subscription remains active while you enter another code. Any new term extends its expiry date."
                      : "Your 24-hour trial is active. Redeeming a code starts your paid subscription immediately."}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="activation-gate-content min-w-0 w-full bg-background">
          {children}
        </div>
      </div>
    );
  }

  return <ActivationScreen email={user?.email || ""} onSignOut={signOut} />;
};

const ADMIN_WHATSAPP = ["2348124504552", "2347043353166"];

const ActivationScreen = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => {
  const [code, setCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [planType, setPlanType] = useState("");
  const { validateCode, validating, error } = useActivation();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    const result = await validateCode(normalized);
    if (result.success) {
      setPlanType(result.duration_days ? result.duration_days + " days" : result.plan_type || "subscription");
      setShowSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [code, validateCode]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text.trim().toUpperCase());
    } catch {
      // fallback
    }
  }, []);

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Activated!</h2>
          <p className="text-muted-foreground mb-2">
            Your subscription is active for <strong className="text-accent">{planType}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting you to the app...</p>
          <div className="flex justify-center mt-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      <div className="absolute inset-0 chalk-texture opacity-50" />

      <Card className="w-full max-w-md relative z-10 border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mx-auto mb-4">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Rutex Master</span>
          </div>
          <CardTitle className="text-2xl font-bold">Activate Your Account</CardTitle>
          <CardDescription>
            Enter your activation code to access the app
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-secondary/30 rounded-lg p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{email}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Activation Code
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  className="pl-10 font-mono text-center tracking-[0.2em] uppercase"
                  maxLength={14}
                  disabled={validating}
                  autoFocus
                  autoComplete="off"
                />
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive flex items-center gap-1.5 mt-1.5"
                >
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </motion.p>
              )}
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Format: XXXX-XXXX-XXXX (letters and numbers)
              </p>
            </div>

            <Button
              type="submit"
              disabled={code.trim().length < 14 || validating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-12 text-base"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Activate Now
                </>
              )}
            </Button>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handlePaste}
                className="text-xs text-primary hover:underline"
              >
                Paste from clipboard
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
              <p className="text-xs font-semibold text-accent mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Need an activation code?
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Contact the administrator to purchase a token:
              </p>
              <div className="space-y-2">
                <a
                  href={`mailto:${ADMIN_EMAIL}`}
                  className="flex items-center gap-2 text-xs text-primary hover:underline bg-secondary/30 rounded-lg px-3 py-2"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {ADMIN_EMAIL}
                </a>
                <a
                  href={`https://wa.me/2348124504552?text=Hi%20I%20want%20to%20purchase%20a%20JUPEB%20Master%20activation%20code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline bg-secondary/30 rounded-lg px-3 py-2"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  08124504552 (WhatsApp)
                </a>
                <a
                  href={`https://wa.me/2347043353166?text=Hi%20I%20want%20to%20purchase%20a%20JUPEB%20Master%20activation%20code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline bg-secondary/30 rounded-lg px-3 py-2"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  07043353166 (WhatsApp)
                </a>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="w-full text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <img src={rutexLogo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            <p className="text-xs text-muted-foreground">Built by <span className="font-semibold text-foreground">Rutex</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivationGate;
