import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { NATIVE_AUTH_REDIRECT_URI } from '@/lib/native-app-config';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; needsMfa?: boolean }>;
  verifyMfa: (code: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_REQUEST_TIMEOUT_MS = 15_000;

function withAuthRequestTimeout<T>(request: PromiseLike<T>, action: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${action} timed out. Check your connection and try again.`));
    }, AUTH_REQUEST_TIMEOUT_MS);
    Promise.resolve(request).then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Set Realtime auth token so channels can connect
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        } else {
          supabase.realtime.setAuth(null);
        }
        // INITIAL_SESSION resolves via getSession() below to avoid a race
        // where the event fires null before getSession() restores the session.
        if (event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    // Get initial session with timeout
    const sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Set Realtime auth token for channels to connect
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to restore auth session:', err);
      setLoading(false);
    });

    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 10000);

    sessionPromise.finally(() => clearTimeout(timeoutId));

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Poll the server-side session record so a device that was displaced by a
  // later login is signed out locally, even while its cached access JWT remains
  // within its normal expiry window.
  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) return;

    let cancelled = false;
    const checkDeviceSession = async () => {
      // Do not revoke another device while this sign-in is still waiting for
      // its required second factor. The same polling check becomes active as
      // soon as the user completes MFA (AAL2).
      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled || assuranceError) {
        if (assuranceError) console.warn("[auth] could not verify MFA level before device handoff");
        return;
      }
      if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") return;

      const { error } = await supabase.functions.invoke("enforce-single-session", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (cancelled || !error) return;

      const response = (error as { context?: Response }).context;
      if (response?.status === 401) {
        await supabase.auth.signOut({ scope: "local" });
        return;
      }
      console.warn("[auth] temporary device-session verification failure", error);
    };

    const handleResume = () => { void checkDeviceSession(); };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkDeviceSession();
    };

    void checkDeviceSession();
    const intervalId = window.setInterval(() => { void checkDeviceSession(); }, 20_000);
    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.access_token]);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await withAuthRequestTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            // Native email verification returns through the active package's
            // custom URL scheme so the native bridge can exchange and persist it.
            emailRedirectTo: Capacitor.isNativePlatform()
              ? NATIVE_AUTH_REDIRECT_URI
              : window.location.origin,
            data: { display_name: email.split('@')[0] },
          },
        }),
        "Sign up",
      );
      return { error, needsEmailConfirmation: !error && !data.session };
    } catch (error) {
      return { error: error as Error, needsEmailConfirmation: false };
    }
  };

  const signInWithGoogle = async () => {
    const isNativePlatform = Capacitor.getPlatform() !== 'web';
    try {
      const { data, error } = await withAuthRequestTimeout(
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            // Native Android and iOS return through the registered app URL scheme.
            // The web app returns to its own root after Supabase exchanges OAuth.
            redirectTo: isNativePlatform ? NATIVE_AUTH_REDIRECT_URI : window.location.origin,
            skipBrowserRedirect: isNativePlatform,
            queryParams: { prompt: 'select_account' },
          },
        }),
        'Starting Google sign in',
      );
      if (error) return { error };
      if (isNativePlatform) {
        if (!data.url) {
          return { error: new Error('Google sign-in did not return an authorization URL.') };
        }
        await Browser.open({ url: data.url });
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data: loginData, error: loginError } = await supabase.functions.invoke('secure-login', {
        body: { email, password },
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      });
      if (loginError) {
        const context = (loginError as { context?: Response }).context;
        let message = 'Unable to sign in. Please try again.';
        if (context) {
          try {
            const body = await context.clone().json();
            if (typeof body?.error === 'string') message = body.error;
          } catch { /* retain safe fallback */ }
        }
        return { error: new Error(message), needsMfa: false };
      }
      if (!loginData?.access_token || !loginData?.refresh_token) {
        return { error: new Error(typeof loginData?.error === 'string' ? loginData.error : 'Login response was incomplete.'), needsMfa: false };
      }
      const { data, error } = await withAuthRequestTimeout(
        supabase.auth.setSession({
          access_token: loginData.access_token,
          refresh_token: loginData.refresh_token,
        }),
        "Completing sign in",
      );
      if (error) return { error, needsMfa: false };
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }
      const { data: aal } = await withAuthRequestTimeout(
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        "Checking two-factor authentication",
      );
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
        return { error: null, needsMfa: true };
      }
      return { error: null, needsMfa: false };
    } catch (error) {
      return { error: error as Error, needsMfa: false };
    }
  };

  const verifyMfa = async (code: string) => {
    try {
      const { data: factors } = await withAuthRequestTimeout(
        supabase.auth.mfa.listFactors(),
        "Checking your authenticator",
      );
      const totpFactor = factors?.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
      if (!totpFactor) return { error: new Error('No verified TOTP factor found') };
      const { data: challenge, error: challengeError } = await withAuthRequestTimeout(
        supabase.auth.mfa.challenge({ factorId: totpFactor.id }),
        "Requesting two-factor challenge",
      );
      if (challengeError) return { error: challengeError };
      const { error: verifyError } = await withAuthRequestTimeout(
        supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challenge.id,
          code,
        }),
        "Verifying two-factor code",
      );
      if (verifyError) return { error: verifyError };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await withAuthRequestTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Capacitor.getPlatform() === 'ios'
            ? 'com.jupeb.master://auth?flow=recovery'
            : `${window.location.origin}/auth?flow=recovery`,
        }),
        "Sending password reset email",
      );
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await withAuthRequestTimeout(
        supabase.auth.updateUser({ password }),
        "Updating password",
      );
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) return { error };
      await supabase.auth.signOut();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    verifyMfa,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
