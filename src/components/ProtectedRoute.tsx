import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ActivationGate } from './ActivationGate';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPER_ADMIN_EMAIL } from "@/lib/adminEmail";
import { useTheme } from 'next-themes';
import {
  fetchOnboardingStatus,
  getCachedOnboardingStatus,
  patchCachedOnboardingStatus,
  type OnboardingStatus,
} from '@/lib/onboardingStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Runs after activation (the paywall stays first): sends students who have
 * never seen the welcome flow to /onboarding from any entry point, including
 * deep links, and lets them back out once finalized. Skippers
 * (completed_at set, finalized false) pass — the home nudge resumes them.
 * Admins pass always. Status is cached per user per app load, so navigation
 * never waits on a query (the guard remounts on every route change).
 */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { setTheme } = useTheme();
  const [status, setStatus] = useState<OnboardingStatus | null>(() =>
    user ? getCachedOnboardingStatus(user.id) : null,
  );

  useEffect(() => {
    if (!user) { setStatus(null); return; }
    const cached = getCachedOnboardingStatus(user.id);
    if (cached) { setStatus(cached); return; }
    let cancelled = false;
    fetchOnboardingStatus(user.id).then((s) => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, [user]);

  // Restore the student's chosen appearance on a fresh device — but only when
  // this browser has no stored theme, so a live toggle made here always wins.
  useEffect(() => {
    if (!user || !status?.loaded) return;
    if (localStorage.getItem('theme') != null) return;
    if (status.themePreference) setTheme(status.themePreference);
  }, [user, status, setTheme]);

  const onOnboardingPage = location.pathname === '/onboarding';
  const wantsReplay = new URLSearchParams(location.search).get('replay') === '1';

  if (!user || !status || !status.loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status.isAdmin) return <>{children}</>;

  if (onOnboardingPage) {
    const mayEnter = !status.completedAt || !status.finalized || wantsReplay;
    return mayEnter ? <>{children}</> : <Navigate to="/" replace />;
  }

  if (!status.completedAt) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ActivationGate>
      <OnboardingGuard>{children}</OnboardingGuard>
    </ActivationGate>
  );
};

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).single();
        if (cancelled) return;
        if (error) console.error("Admin check failed:", error.message);
        const dbAdmin = data?.is_admin ?? false;
        const emailAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        setIsAdmin(dbAdmin || emailAdmin);
      } catch (err) {
        if (!cancelled) { console.error("Admin check error:", err); }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default ProtectedRoute;
