import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, MessageSquare, Trophy, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import HamburgerMenu, { type HamburgerMenuHandle } from "@/components/HamburgerMenu";
import { useChatUnreadCount } from "@/contexts/ChatUnreadContext";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/past-questions", label: "Questions", icon: BookOpen },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const menuRef = useRef<HamburgerMenuHandle>(null);
  const { totalUnread, staleUnread } = useChatUnreadCount();

  return (
    <>
      <HamburgerMenu ref={menuRef} />
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border pb-safe">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive =
              path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path);
            const isChat = path === "/chat";
            const showBadge = isChat && totalUnread > 0;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-[color,transform] duration-150 active:scale-90 min-w-0 relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {showBadge && (
                    <span className={cn(
                      "absolute -top-1.5 -right-2 text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 leading-none",
                      staleUnread
                        ? "bg-muted text-muted-foreground border border-dashed border-muted-foreground/40"
                        : "bg-destructive text-destructive-foreground"
                    )}>
                      {staleUnread ? "?" : totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => menuRef.current?.open()}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 active:scale-90"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
