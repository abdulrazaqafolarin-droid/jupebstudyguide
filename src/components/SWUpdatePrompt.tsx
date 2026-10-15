import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The service worker precaches every bundle and calls skipWaiting, so a
 * phone with the app installed (or a tab left open) keeps running the OLD
 * release with zero indication. This banner surfaces the moment a newer
 * release takes control and reloads into it on tap.
 *
 * Implemented against navigator.serviceWorker directly (rather than the
 * pwa-register virtual module) so it works with the hand-written
 * injectManifest service worker in src/sw.ts.
 */
export function SWUpdatePrompt() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    let hourly: ReturnType<typeof setInterval> | undefined;

    // A new SW activated (skipWaiting) while this page runs old code.
    const onControllerChange = () => {
      if (!disposed) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker.ready
      .then((registration) => {
        if (disposed) return;
        // Hourly update checks — installed phones otherwise only
        // check for updates on cold start.
        hourly = setInterval(() => {
          void registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (hourly) clearInterval(hourly);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[9998] w-[92vw] max-w-sm -translate-x-1/2"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-popover/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">New version available</p>
          <p className="truncate text-xs text-muted-foreground">
            Refresh to get the latest fixes and content.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 shrink-0 gap-1.5"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

export default SWUpdatePrompt;
