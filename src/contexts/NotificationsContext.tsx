import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useNotifications, type AppNotification, type NotificationKind } from "@/hooks/useNotifications";

interface StreakData {
  hasStudiedToday: boolean;
  currentStreak: number;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  markReadExcept: (kinds: Set<string>) => void;
  markReadByKind: (kind: NotificationKind) => void;
  clear: () => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  updateStreakData: (data: StreakData) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [streakData, setStreakData] = useState<StreakData>({
    hasStudiedToday: false,
    currentStreak: 0,
  });

  const value = useNotifications(streakData);

  return (
    <NotificationsContext.Provider value={{ ...value, updateStreakData: setStreakData, markReadExcept: value.markReadExcept, markReadByKind: value.markReadByKind }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotificationsContext must be used within NotificationsProvider");
  return ctx;
}
