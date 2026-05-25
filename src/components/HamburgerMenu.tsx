import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Trophy, MessageSquare, User, Shield, Download,
  Bell, BellRing, X, LogOut, ChevronLeft, BookOpen, Library
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationsContext } from "@/contexts/NotificationsContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_EMAIL } from "@/lib/adminEmail";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { NotificationCenter } from "@/components/NotificationCenter";

const easeOut = [0.23, 1, 0.32, 1] as const;

const navLinks = [
  { path: "/", label: "Home", icon: Home },
  { path: "/past-questions", label: "Past Questions", icon: BookOpen },
  { path: "/chat", label: "Study Chat", icon: MessageSquare },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/download", label: "Get App", icon: Download },
];

export interface HamburgerMenuHandle {
  open: () => void;
  close: () => void;
}

interface HamburgerMenuProps {
  streakData?: { hasStudiedToday: boolean; currentStreak: number };
}

const HamburgerMenu = forwardRef<HamburgerMenuHandle, HamburgerMenuProps>(({ streakData }, ref) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const reduced = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const {
    notifications, unreadCount, markAllRead, markReadExcept, clear: clearNotifications,
    permission, requestPermission,
  } = useNotificationsContext();

  useEffect(() => {
    if (!user) { setIsAdmin(false); setProfileName(null); setProfileAvatar(null); return; }
    const emailAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    supabase.from("profiles").select("is_admin, display_name, avatar_url").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setIsAdmin(data.is_admin || emailAdmin);
        setProfileName(data.display_name);
        setProfileAvatar(data.avatar_url);
      } else {
        setIsAdmin(emailAdmin);
      }
      if (emailAdmin && data && !data.is_admin) {
        supabase.from("profiles").update({ is_admin: true }).eq("user_id", user.id).catch(() => {});
      }
    });
  }, [user]);

  const allLinks = isAdmin
    ? [...navLinks, { path: "/admin", label: "Admin", icon: Shield }]
    : navLinks;

  const close = () => setOpen(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (open) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const drawerVariants = reduced.current
    ? { closed: { opacity: 0 }, open: { opacity: 1 } }
    : {
        closed: { x: "-100%", opacity: 0 },
        open: { x: 0, opacity: 1 },
      };

  const linkVariants = reduced.current
    ? { closed: { opacity: 0 }, open: { opacity: 1 } }
    : {
        closed: { x: -16, opacity: 0 },
        open: { x: 0, opacity: 1 },
      };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={close}
            />

            <motion.nav
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
                open: { transition: { staggerChildren: 0.04, staggerDirection: 1 } },
              }}
              transition={{ type: "tween", duration: 0.25, ease: easeOut }}
              className={cn(
                "fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw]",
                "bg-card/95 backdrop-blur-xl border-r border-border",
                "flex flex-col shadow-2xl"
              )}
            >
              <motion.div
                variants={drawerVariants}
                transition={{ type: "tween", duration: 0.25, ease: easeOut }}
                className="flex flex-col h-full"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      url={profileAvatar}
                      name={profileName ?? user?.email}
                      className="w-9 h-9 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {profileName || user?.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <NotificationCenter
                      notifications={notifications}
                      unreadCount={unreadCount}
                      onMarkAllRead={markAllRead}
                      onMarkReadExcept={markReadExcept}
                      onClear={clearNotifications}
                      permission={permission}
                      onRequestPermission={requestPermission}
                    />
                    <button
                      onClick={close}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 py-2 overflow-y-auto">
                  {allLinks.map(({ path, label, icon: Icon }) => {
                    const isActive =
                      path === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(path);
                    return (
                      <motion.div key={path} variants={linkVariants} transition={{ type: "tween", duration: 0.2, ease: easeOut }}>
                        <Link
                          to={path}
                          onClick={close}
                          className={cn(
                            "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          )}
                        >
                          <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                          <span className="text-sm">{label}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  variants={linkVariants}
                  transition={{ type: "tween", duration: 0.2, ease: easeOut }}
                  className="border-t border-border px-4 py-3 shrink-0"
                >
                  <button
                    onClick={() => { close(); signOut(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span className="text-sm">Sign out</span>
                  </button>
                </motion.div>
              </motion.div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

export default HamburgerMenu;
