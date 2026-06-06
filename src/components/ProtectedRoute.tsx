import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ActivationGate } from './ActivationGate';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPER_ADMIN_EMAIL } from "@/lib/adminEmail";

interface ProtectedRouteProps {
  children: React.ReactNode;
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

  return <ActivationGate>{children}</ActivationGate>;
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
