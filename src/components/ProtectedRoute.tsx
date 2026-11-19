import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ActivationGate } from './ActivationGate';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPER_ADMIN_EMAIL } from '@/lib/adminEmail';
import { useTheme } from 'next-themes';
import { fetchOnboardingStatus, getCachedOnboardingStatus, type OnboardingStatus } from '@/lib/onboardingStatus';
import { getExamProgramRoute, isJambWorkspacePath, type ExamProgramId } from '@/lib/exam-program';

interface ProtectedRouteProps { children: React.ReactNode; }

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { setTheme } = useTheme();
  const programId: ExamProgramId = isJambWorkspacePath(location.pathname) ? 'jamb' : 'jupeb';
  const route = getExamProgramRoute(programId);
  const onboardingPath = route === '/' ? '/onboarding' : `${route}/onboarding`;
  const [status, setStatus] = useState<OnboardingStatus | null>(() =>
    user ? getCachedOnboardingStatus(user.id, programId) : null,
  );
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user) { setStatus(null); setLoadError(false); return; }
    const cached = getCachedOnboardingStatus(user.id, programId);
    if (cached) { setStatus(cached); setLoadError(false); return; }
    let cancelled = false;
    setStatus(null);
    setLoadError(false);
    fetchOnboardingStatus(user.id, programId)
      .then((next) => { if (!cancelled) setStatus(next); })
      .catch((error) => {
        if (cancelled) return;
        console.error('[onboarding] status load failed:', error);
        setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [user?.id, programId, retry]);

  useEffect(() => {
    if (!user || !status?.loaded) return;
    if (localStorage.getItem('theme') != null) return;
    if (status.themePreference) setTheme(status.themePreference);
  }, [user?.id, status, setTheme]);

  const onOnboardingPage = location.pathname === onboardingPath;
  const wantsReplay = new URLSearchParams(location.search).get('replay') === '1';

  if (loadError && !status) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-3 text-center">
          <p className="font-semibold text-foreground">Couldn't load your study profile</p>
          <p className="text-sm text-muted-foreground">Check your connection and try again. Your saved study data has not been changed.</p>
          <button type="button" className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" onClick={() => setRetry((value) => value + 1)}>Try again</button>
        </div>
      </div>
    );
  }
  if (!user || !status?.loaded) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (status.isAdmin) return <>{children}</>;
  if (onOnboardingPage) {
    const mayEnter = !status.completedAt || !status.finalized || wantsReplay;
    return mayEnter ? <>{children}</> : <Navigate to={route} replace />;
  }
  if (!status.completedAt) return <Navigate to={onboardingPath} replace />;
  return <>{children}</>;
}

function RequireProgrammeSelection({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [selected, setSelected] = useState<ExamProgramId | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSelected(undefined);
    setLoadError(false);
    void (async () => {
      try {
        const { data, error } = await supabase.from('profiles')
          .select('selected_exam_program').eq('user_id', user.id).maybeSingle();
        if (cancelled) return;
        if (error) { setLoadError(true); return; }
        const value = data?.selected_exam_program;
        setSelected(value === 'jamb' || value === 'jupeb' ? value : null);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, retry]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm space-y-3 text-center">
          <p className="font-semibold">Couldn't load your selected programme</p>
          <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
          <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" onClick={() => setRetry((value) => value + 1)}>Retry</button>
        </div>
      </div>
    );
  }
  if (selected === undefined) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!selected) return <Navigate to="/onboarding/program" replace state={{ from: location.pathname }} />;
  if (location.pathname === '/' && selected === 'jamb') return <Navigate to="/jamb" replace />;
  return <>{children}</>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const programId: ExamProgramId = isJambWorkspacePath(location.pathname) ? 'jamb' : 'jupeb';
  useEffect(() => {
    if (!user?.id) return;
    void fetchOnboardingStatus(user.id, programId).catch(() => {});
  }, [user?.id, programId]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <RequireProgrammeSelection>
      <ActivationGate programId={programId}>
        <OnboardingGuard>{children}</OnboardingGuard>
      </ActivationGate>
    </RequireProgrammeSelection>
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
        const { data, error } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
        if (cancelled) return;
        if (error) console.error('Admin check failed:', error.message);
        setIsAdmin((data?.is_admin ?? false) || user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
      } catch (error) {
        if (!cancelled) console.error('Admin check error:', error);
      } finally { if (!cancelled) setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || checking) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default ProtectedRoute;
