import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useActivation } from "@/hooks/useActivation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Key, CheckCircle, Loader2, AlertCircle, LogOut, Mail, MessageCircle, DollarSign, Clock } from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/adminEmail";
import rutexLogo from "@/assets/rutex-logo.jpg";

interface ActivationGateProps {
  children: React.ReactNode;
}

function getTrialExpiry(userId: string): number {
  const key = `u:${userId}:trial-expires-at`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === "number" && parsed > Date.now()) return parsed;
    }
  } catch {}
  const end = Date.now() + 24 * 60 * 60 * 1000;
  try { localStorage.setItem(key, JSON.stringify(end)); } catch {}
  return end;
}

function formatTrialTimeLeft(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h ${m}m`;
}

export const ActivationGate = ({ children }: ActivationGateProps) => {
  const { status } = useActivation();
  const { user, signOut } = useAuth();

  const trialExpiry = useMemo(() => {
    if (!user?.id) return 0;
    return getTrialExpiry(user.id);
  }, [user?.id]);

  const trialActive = trialExpiry > Date.now();
  const trialTimeLeft = trialExpiry - Date.now();

  if (status.checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking activation...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const ADMIN_WHATSAPP = ["2348124504552", "2347043353166"];

const ActivationScreen = ({ email, onSignOut, trialExpired }: { email: string; onSignOut: () => void; trialExpired?: boolean }) => {
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
      setPlanType(result.plan_type || "basic");
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
            Your account has been activated with the <strong className="text-accent">{planType}</strong> plan.
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
            <span className="text-sm font-medium text-primary">Rutex Jupeb Master</span>
          </div>
          <CardTitle className="text-2xl font-bold">Activate Your Account</CardTitle>
          <CardDescription>
            Enter your activation code to access the app
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {trialExpired && (
            <div className="bg-destructive/10 rounded-lg p-3 flex items-center gap-2 border border-destructive/20">
              <Clock className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive font-medium">Your free trial has ended. Enter an activation code to continue.</p>
            </div>
          )}
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
                  href={`https://wa.me/2348124504552?text=Hi%20I%20want%20to%20purchase%20a%20Rutex%20Jupeb%20Master%20activation%20code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline bg-secondary/30 rounded-lg px-3 py-2"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  08124504552 (WhatsApp)
                </a>
                <a
                  href={`https://wa.me/2347043353166?text=Hi%20I%20want%20to%20purchase%20a%20Rutex%20Jupeb%20Master%20activation%20code`}
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
