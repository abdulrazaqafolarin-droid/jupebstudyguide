import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { purgeForeignUserData } from '@/lib/storageCleanup';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; needsMfa?: boolean }>;
  verifyMfa: (code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUserId = session?.user?.id ?? null;
        purgeForeignUserData(newUserId);
        setSession(session);
        setUser(session?.user ?? null);
        prevUserIdRef.current = newUserId;
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
      const newUserId = session?.user?.id ?? null;
      purgeForeignUserData(newUserId);
      setSession(session);
      setUser(session?.user ?? null);
      // Set Realtime auth token for channels to connect
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      setLoading(false);
      prevUserIdRef.current = newUserId;
    }).catch((err) => {
      console.error('Failed to restore auth session:', err);
      purgeForeignUserData(null);
      setLoading(false);
    });

    const timeoutId = setTimeout(() => {
      purgeForeignUserData(null);
      setLoading(false);
    }, 10000);

    sessionPromise.finally(() => clearTimeout(timeoutId));

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: email.split('@')[0] },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (attempt === 0 && (error.message?.includes('signal is aborted') || error.message?.includes('AbortError'))) {
            try {
              const keys = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.includes('supabase') || k.includes('sb-') || k.startsWith('oauth'))) keys.push(k);
              }
              keys.forEach(k => localStorage.removeItem(k));
            } catch {}
            continue;
          }
          return { error, needsMfa: false };
        }
        if (data.session?.access_token) {
          supabase.realtime.setAuth(data.session.access_token);
        }
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
          return { error: null, needsMfa: true };
        }
        return { error: null, needsMfa: false };
      } catch (error) {
        if (attempt === 0) {
          try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.includes('supabase') || k.includes('sb-') || k.startsWith('oauth'))) keys.push(k);
            }
            keys.forEach(k => localStorage.removeItem(k));
          } catch {}
          continue;
        }
        return { error: error as Error, needsMfa: false };
      }
    }
    return { error: new Error('Unable to connect. Please check your network and try again.'), needsMfa: false };
  };

  const verifyMfa = async (code: string) => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
      if (!totpFactor) return { error: new Error('No verified TOTP factor found') };
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) return { error: challengeError };
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
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
    signOut,
    resetPassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
