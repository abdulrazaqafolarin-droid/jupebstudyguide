import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, MessageSquare, Trophy, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import HamburgerMenu, { type HamburgerMenuHandle } from "@/components/HamburgerMenu";

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
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => menuRef.current?.open()}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
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
