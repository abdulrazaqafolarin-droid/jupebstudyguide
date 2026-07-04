import { useState, useCallback } from "react";
import { useActivation } from "@/hooks/useActivation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Loader2, XCircle, LogOut, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ActivationPrompt() {
  const { status, validating, error, validateCode, refreshStatus } = useActivation();
  const { signOut } = useAuth();
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);

  const formatCode = useCallback((value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    return parts.join("-");
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 14) return;
    const result = await validateCode(code);
    if (result.success) {
      setSuccess(true);
      refreshStatus();
    }
  };

  const fullCode = code.replace(/-/g, "");
  const isValidFormat = fullCode.length === 12;

  if (status.checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success || status.is_activated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Branding */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Rutex Jupeb Master</span>
          </div>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Key className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Activate Your Account</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your activation code to unlock full access to JUPEB past questions, AI tutoring, and study tools.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Activation Code</label>
                <Input
                  type="text"
                  value={code}
                  onChange={handleInput}
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                  disabled={validating}
                  className={cn(
                    "text-center font-mono text-lg tracking-[0.25em] h-12",
                    code.length === 14 && isValidFormat
                      ? "border-accent/50 focus-visible:ring-accent"
                      : ""
                  )}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!isValidFormat || validating}
                className="w-full bg-gradient-to-r from-primary to-accent h-12 text-base"
              >
                {validating ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Key className="w-5 h-5 mr-2" />
                )}
                {validating ? "Activating..." : "Activate"}
              </Button>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                Don't have a code? Contact your administrator to purchase access.
              </p>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60">
          Built by Rutex
        </p>
      </div>
    </div>
  );
}
