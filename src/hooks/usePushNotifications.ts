import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BCzx03Ds_U9JPP4VDWOzcYpw5ETez0tH2s6XFdDCBMzowsye2YCwwMu2XdKW4d35pVLF1ThFGGbuDdW4QCGypaw';
const PUSH_ENABLED = 'push_enabled';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
    }
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!supported || !user) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [supported, user]);

  const subscribe = useCallback(async () => {
    if (!supported || !user) return;

    const swReg = await navigator.serviceWorker.ready;
    let sub = await swReg.pushManager.getSubscription();
    if (sub) {
      setIsSubscribed(true);
      return;
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
    }

    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return;

    sub = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const rawKey = sub.getKey('p256dh');
    const rawAuth = sub.getKey('auth');
    if (!rawKey || !rawAuth) return;

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    const auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));

    const { error } = await supabase.from('notification_subscriptions').insert({
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    });

    if (error) {
      console.error('Failed to save push subscription:', error);
      return;
    }

    setIsSubscribed(true);
  }, [supported, user]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !user) return;

    const swReg = await navigator.serviceWorker.ready;
    const sub = await swReg.pushManager.getSubscription();
    if (!sub) {
      setIsSubscribed(false);
      return;
    }

    await sub.unsubscribe();

    await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('endpoint', sub.endpoint);

    setIsSubscribed(false);
  }, [supported, user]);

  return {
    supported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  };
}
