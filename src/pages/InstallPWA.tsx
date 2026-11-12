import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Download, MoreVertical, Share2, Smartphone } from "lucide-react";

type InstallChoice = { outcome: "accepted" | "dismissed" };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};
type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isAppInstalled(): boolean {
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

export default function InstallPWA() {
  const deferredPrompt = useRef<InstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(() => isAppInstalled());
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as InstallPromptEvent;
      setCanInstall(true);
    };
    const handleInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    const fallbackTimer = window.setTimeout(() => setShowManualSteps(true), 3500);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) {
      setShowManualSteps(true);
      return;
    }

    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPrompt.current = null;
      setCanInstall(false);
      if (choice.outcome === "accepted") {
        setInstalled(true);
      } else {
        setShowManualSteps(true);
      }
    } catch {
      setShowManualSteps(true);
    } finally {
      setInstalling(false);
    }
  }, []);

  const openApp = () => {
    window.location.assign("/");
  };

  const manualSteps = platform === "ios"
    ? [
        "Open this link in Safari.",
        "Tap the Share button.",
        "Choose Add to Home Screen.",
        "Turn on Open as Web App, then tap Add.",
      ]
    : platform === "android"
      ? [
          "Open this link in Chrome (not an in-app browser).",
          "Tap the three-dot menu in Chrome.",
          "Choose Install app or Add to Home screen.",
          "Confirm Install or Add.",
        ]
      : [
          "Open this link in Chrome or Edge.",
          "Use the install icon in the address bar, or open the browser menu.",
          "Choose Install Rutex Master and confirm.",
        ];

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#101319] px-5 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,163,76,0.18),transparent_58%)]" />
      <section className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/pwa-192x192.png"
            alt="Rutex Master app icon"
            className="mb-5 h-24 w-24 rounded-[1.7rem] shadow-2xl ring-1 ring-white/10"
            width="96"
            height="96"
          />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4A34C]">
            JUPEB Study App
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Rutex Master</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
            Add Rutex Master to your phone and open it from your home screen like a regular app.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
          {installed ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <div>
                <h2 className="text-lg font-semibold">Rutex Master is installed</h2>
                <p className="mt-1 text-sm text-white/60">Open the app and continue studying.</p>
              </div>
              <button
                type="button"
                onClick={openApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A34C] px-5 py-3.5 font-semibold text-[#171717] transition hover:bg-[#e2b761] active:scale-[0.99]"
              >
                Open Rutex Master <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
                <Smartphone className="h-5 w-5 shrink-0 text-[#D4A34C]" />
                <div>
                  <p className="text-sm font-semibold">Install the app</p>
                  <p className="text-xs text-white/55">It will open in its own app window.</p>
                </div>
              </div>

              {canInstall ? (
                <button
                  type="button"
                  onClick={install}
                  disabled={installing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A34C] px-5 py-3.5 font-semibold text-[#171717] transition hover:bg-[#e2b761] active:scale-[0.99] disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {installing ? "Opening install prompt…" : "Install Rutex Master"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowManualSteps(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A34C] px-5 py-3.5 font-semibold text-[#171717] transition hover:bg-[#e2b761] active:scale-[0.99]"
                >
                  <Download className="h-4 w-4" />
                  Show install instructions
                </button>
              )}

              {showManualSteps && !canInstall && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-3 text-sm font-semibold">Finish installing in your browser</p>
                  <ol className="space-y-2 text-sm text-white/70">
                    {manualSteps.map((step, index) => (
                      <li key={step} className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-[#D4A34C]">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {platform === "ios" && (
                    <p className="mt-3 text-xs leading-5 text-white/45">
                      On iPhone and iPad, installation is completed from Safari’s Share menu.
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={openApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.06]"
              >
                Open without installing <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-[11px] leading-5 text-white/40">
                Your browser will ask you to confirm installation. No APK download is required for the PWA.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-white/35">
          <span className="inline-flex items-center gap-1.5">
            {platform === "ios" ? <Share2 className="h-3 w-3" /> : <MoreVertical className="h-3 w-3" />}
            Secure installation through your browser
          </span>
        </p>
      </section>
    </main>
  );
}
