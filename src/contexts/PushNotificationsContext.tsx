import { createContext, useContext, type ReactNode } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationsContextValue {
  supported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const value = usePushNotifications();
  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotificationsContext() {
  const ctx = useContext(PushNotificationsContext);
  if (!ctx) throw new Error('usePushNotificationsContext must be used within PushNotificationsProvider');
  return ctx;
}
