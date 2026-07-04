import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, ShieldCheck, ShieldOff, Smartphone, Key, Check, X, Loader2, Copy, CheckCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type MfaStep = 'idle' | 'enrolling' | 'verify' | 'enrolled' | 'removing';

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<MfaStep>('idle');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aal, setAal] = useState<string>('aal1');

  const checkMfaStatus = useCallback(async () => {
    if (!user) return;
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData) setAal(aalData.currentLevel);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasTotp = factors?.all.some(f => f.factor_type === 'totp' && f.status === 'verified');
    setMfaEnabled(!!hasTotp);
    if (hasTotp) setStep('enrolled');
    else setStep('idle');
  }, [user]);

  useEffect(() => { checkMfaStatus(); }, [checkMfaStatus]);

  const handleEnroll = async () => {
    if (!user) return;
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Rutex Jupeb Master',
      friendlyName: 'Authenticator',
    });
    if (error || !data) {
      toast.error('Failed to start enrollment');
      setEnrolling(false);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep('verify');
    setEnrolling(false);
  };

  const handleVerify = async () => {
    if (!factorId || otpValue.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challengeData) throw challengeError || new Error('Challenge failed');
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: otpValue,
      });
      if (verifyError) {
        toast.error('Invalid code. Try again.');
        setOtpValue('');
        setVerifying(false);
        return;
      }
      await supabase.from('profiles').update({ mfa_enrolled: true, mfa_enrolled_at: new Date().toISOString() }).eq('user_id', user!.id);
      toast.success('Two-factor authentication enabled');
      setStep('enrolled');
      setMfaEnabled(true);
      setOtpValue('');
    } catch {
      toast.error('Verification failed');
    }
    setVerifying(false);
  };

  const handleRemove = async () => {
    if (!user) return;
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
    if (!totpFactor) return;
    setRemoving(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
    if (error) { toast.error('Failed to remove 2FA'); setRemoving(false); return; }
    await supabase.from('profiles').update({ mfa_enrolled: false, mfa_enrolled_at: null }).eq('user_id', user.id);
    toast.success('Two-factor authentication disabled');
    setMfaEnabled(false);
    setStep('idle');
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setRemoving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-sm">Security</h1>
            <p className="text-[10px] text-muted-foreground">Two-factor authentication</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'bg-card rounded-2xl border p-5',
            mfaEnabled ? 'border-emerald-500/30' : 'border-border'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                mfaEnabled ? 'bg-emerald-500/20' : 'bg-muted'
              )}>
                {mfaEnabled ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ShieldOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {mfaEnabled ? 'Two-factor enabled' : 'Two-factor disabled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mfaEnabled
                    ? `Security level: ${aal.toUpperCase()}`
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
            </div>
            <span className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-full',
              mfaEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
            )}>
              {mfaEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </motion.div>

        {/* Enroll / Manage Section */}
        <AnimatePresence mode="wait">
          {step === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-card rounded-2xl border p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold">Authenticator App</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use Google Authenticator, Microsoft Authenticator, or any TOTP-compatible app
                    to generate one-time codes.
                  </p>
                </div>
              </div>
              <Button onClick={handleEnroll} disabled={enrolling} className="w-full">
                {enrolling ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Enable Two-Factor Authentication
              </Button>
            </motion.div>
          )}

          {step === 'verify' && qrCode && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-card rounded-2xl border p-5 space-y-5"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold">Scan QR Code</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Scan this QR code with your authenticator app, then enter the 6-digit code below.
              </p>
              <div className="flex justify-center">
                <div
                  className="w-48 h-48 rounded-xl bg-white p-3 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />
              </div>
              {secret && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Or enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-secondary/50 rounded-lg px-3 py-2 truncate select-all">
                      {secret}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(secret);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium">Enter 6-digit code</p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={setOtpValue}
                    onComplete={handleVerify}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setStep('idle'); setOtpValue(''); }}
                    disabled={verifying}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleVerify}
                    disabled={otpValue.length !== 6 || verifying}
                  >
                    {verifying ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Verify
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'enrolled' && (
            <motion.div
              key="enrolled"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-card rounded-2xl border p-5 space-y-4"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Your account is protected by two-factor authentication. Each time you sign in,
                  you'll need your password and a 6-digit code from your authenticator app.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">What if I lose my device?</p>
                <p className="text-xs text-muted-foreground">
                  If you lose access to your authenticator app, contact support to have 2FA
                  disabled on your account.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                Disable Two-Factor Authentication
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border p-5 space-y-3"
        >
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About 2FA</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">1.</span>
              Download an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">2.</span>
              Scan the QR code or enter the setup key manually
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">3.</span>
              Enter the 6-digit code from the app to verify
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
