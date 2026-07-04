import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle, ShieldAlert, Smartphone } from 'lucide-react';
import rutexLogo from '@/assets/rutex-logo.jpg';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
});

type AuthMode = 'login' | 'signup' | 'forgot' | 'forgot-sent' | 'mfa';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);

  const { signIn, verifyMfa, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
      if (!email.trim()) { setErrors({ email: 'Email is required' }); return; }
      setErrors({});
      setLoading(true);
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        toast({
          title: "Failed to send reset email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setMode('forgot-sent');
      }
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (mode === 'login') {
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error, needsMfa } = await signIn(email, password);
          if (!error) {
            if (needsMfa) {
              setMode('mfa');
            } else {
              toast({
                title: "Welcome back!",
                description: "You've successfully logged in.",
              });
              navigate('/');
            }
            return;
          }
          if (error.message?.includes('signal is aborted') || error.message?.includes('AbortError')) {
            if (attempt === 0) {
              try {
                const sbKeys = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && (k.includes('supabase') || k.includes('sb-'))) sbKeys.push(k);
                }
                sbKeys.forEach(k => localStorage.removeItem(k));
              } catch {}
              continue;
            }
          }
          toast({
            title: "Login failed",
            description: attempt > 0 ? "Connection issue. Please check your network and try again." : error.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created!",
            description: "You can now log in with the credentials you just created.",
          });
          setMode('login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) return;
    setMfaVerifying(true);
    const { error } = await verifyMfa(mfaCode);
    if (error) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      setMfaVerifying(false);
      return;
    }
    toast({
      title: "Welcome back!",
      description: "Two-factor verification successful.",
    });
    navigate('/');
  };

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isForgotSent = mode === 'forgot-sent';
  const isMfa = mode === 'mfa';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      <div className="absolute inset-0 chalk-texture opacity-50" />

      <Card className="w-full max-w-md relative z-10 border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mx-auto mb-4">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Rutex Jupeb Master</span>
          </div>
          <AnimatePresence mode="wait">
            {isMfa ? (
              <motion.div key="mfa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
                <CardDescription className="mt-2">
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </motion.div>
            ) : isForgotSent ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
                <CardDescription className="mt-2">
                  We've sent a password reset link to <strong className="text-foreground">{email}</strong>
                </CardDescription>
              </motion.div>
            ) : (
              <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <CardTitle className="text-2xl font-bold">
                  {isLogin ? 'Welcome Back' : isSignup ? 'Create Account' : 'Reset Password'}
                </CardTitle>
                <CardDescription>
                  {isLogin ? 'Sign in to continue your learning journey'
                    : isSignup ? 'Start your JUPEB preparation today'
                    : 'Enter your email and we\'ll send you a reset link'}
                </CardDescription>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {isForgotSent ? (
              <motion.div
                key="forgot-sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center py-4">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => switchMode('forgot')}>
                    Try again
                  </Button>
                  <Button className="flex-1" onClick={() => switchMode('login')}>
                    Back to login
                  </Button>
                </div>
              </motion.div>
            ) : isMfa ? (
              <motion.div
                key="mfa"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center py-4 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={mfaCode}
                      onChange={setMfaCode}
                      onComplete={handleMfaVerify}
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setMode('login'); setMfaCode(''); }}
                    disabled={mfaVerifying}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleMfaVerify}
                    disabled={mfaCode.length !== 6 || mfaVerifying}
                  >
                    {mfaVerifying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Verify
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  {errors.email && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> {errors.email}
                    </motion.p>
                  )}
                </div>

                {!isForgot && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">{errors.password}</motion.p>
                    )}
                    {isLogin && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isForgot ? 'Sending...' : isLogin ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    isForgot ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'
                  )}
                </Button>

                {isForgot && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full text-xs text-primary hover:underline font-medium text-center"
                  >
                    <ArrowLeft className="w-3 h-3 inline mr-1" />
                    Back to login
                  </button>
                )}
              </motion.form>
            )}
          </AnimatePresence>

          {!isForgot && !isForgotSent && !isMfa && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button
                  onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                  className="ml-2 text-primary hover:underline font-medium"
                  disabled={loading}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-border flex flex-col items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => navigate('/download')}
            >
              <Smartphone className="w-4 h-4" />
              Download App
            </Button>
            <div className="flex flex-col items-center gap-2">
              <img src={rutexLogo} alt="Rutex Logo" className="w-8 h-8 rounded-lg object-cover" />
              <p className="text-xs text-muted-foreground">Built by <span className="font-semibold text-foreground">Rutex</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
