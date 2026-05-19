import { useMemo, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Trophy, MessageSquare, User, Crown, Shield } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MenuBarProps {
  streakData?: { hasStudiedToday: boolean; currentStreak: number };
}

export default function MenuBar({ streakData }: MenuBarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { unreadCount } = useNotifications({ hasStudiedToday: streakData?.hasStudiedToday ?? false, currentStreak: streakData?.currentStreak ?? 0 });

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("profiles").select("is_admin").eq("user_id", user.id).single().then(({ data }) => {
      setIsAdmin(data?.is_admin ?? false);
    });
  }, [user]);

  const links = useMemo(
    () => [
      { path: "/", label: "Home", icon: Home },
      { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { path: "/chat", label: "Chat", icon: MessageSquare, badge: undefined },
      { path: "/profile", label: "Profile", icon: User },
      ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield, badge: undefined as undefined }] : []),
    ],
    [isAdmin]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80">
      <div className="max-w-4xl mx-auto flex items-center justify-around px-2 py-1">
        {links.map(({ path, label, icon: Icon, badge }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {(path === "/chat" ? unreadCount > 0 : false) && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
