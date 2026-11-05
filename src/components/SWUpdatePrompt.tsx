import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Prompt-driven PWA updater for the hand-written injectManifest worker.
 * New workers wait until the student chooses Update; that action explicitly
 * messages SKIP_WAITING and reloads only after the new worker claims this tab.
 */
export function SWUpdatePrompt() {
  const [updateReady, setUpdateReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const applyRequestedRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    let interval: number | undefined;
    // A first install may claim this page after React has mounted. Track the
    // first controller transition so later updates are still offered.
    let hasControlledOnce = Boolean(navigator.serviceWorker.controller);

    const revealWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (!disposed && hasControlledOnce && registration.waiting) setUpdateReady(true);
    };

    const onControllerChange = () => {
      if (disposed) return;
      // The initial service worker activation is not an update: do not reload
      // or show a banner simply because this tab became controlled for the
      // first time. From this point onward, controller changes indicate that
      // another tab or this tab has applied a newer worker.
      if (!hasControlledOnce) {
        hasControlledOnce = true;
        return;
      }

      if (applyRequestedRef.current) {
        applyRequestedRef.current = false;
        if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
        window.location.reload();
        return;
      }
      // Another tab may have applied an update. This tab still runs its old
      // JavaScript bundle, so offer a reload rather than silently mixing builds.
      setUpdateReady(true);
    };

    const checkForUpdates = async () => {
      const registration = registrationRef.current;
      if (!registration || !navigator.onLine || document.visibilityState !== "visible") return;
      try {
        await registration.update();
      } catch {
        /* the next online/focus check can retry */
      }
      revealWaitingWorker(registration);
    };

    const onUpdateFound = () => {
      const registration = registrationRef.current;
      const installing = registration?.installing;
      if (!registration || !installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed") revealWaitingWorker(registration);
      });
    };

    const onResume = () => {
      if (document.visibilityState === "visible") void checkForUpdates();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("online", onResume);
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);

    void navigator.serviceWorker.ready.then((registration) => {
      if (disposed) return;
      registrationRef.current = registration;
      registration.addEventListener("updatefound", onUpdateFound);
      revealWaitingWorker(registration);
      void checkForUpdates();
      interval = window.setInterval(() => void checkForUpdates(), 6 * 60 * 60 * 1000);
    }).catch(() => {
      /* service worker unavailable; the app still works online */
    });

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("online", onResume);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
      if (interval) window.clearInterval(interval);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
      const registration = registrationRef.current;
      registration?.removeEventListener("updatefound", onUpdateFound);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const registration = registrationRef.current;
    const waiting = registration?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }

    applyRequestedRef.current = true;
    setApplying(true);
    waiting.postMessage({ type: "SKIP_WAITING" });
    // A defensive fallback covers WebViews which fail to dispatch controllerchange.
    fallbackTimerRef.current = window.setTimeout(() => {
      if (applyRequestedRef.current) window.location.reload();
    }, 8_000);
  }, []);

  if (!updateReady) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[9998] w-[92vw] max-w-sm -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-popover/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">New version available</p>
          <p className="truncate text-xs text-muted-foreground">
            {applying ? "Applying update…" : "Refresh to load the newest app files."}
          </p>
        </div>
        <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={applyUpdate} disabled={applying}>
          <RefreshCw className="h-3.5 w-3.5" />
          {applying ? "Updating…" : "Update now"}
        </Button>
      </div>
    </div>
  );
}

export default SWUpdatePrompt;