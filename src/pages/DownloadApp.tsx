import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, Monitor, Zap, Share2, Plus, Download, Loader2 } from "lucide-react";

const APP_URL = "https://rutexjupebmaster.vercel.app";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  globalDeferredPrompt = e as BeforeInstallPromptEvent;
});

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const ua = navigator.userAgent;
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    });
    setDeferredPrompt(globalDeferredPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
    globalDeferredPrompt = null;
    setInstalling(false);
  };

  if (isStandalone || installed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">App Installed</h1>
            <p className="text-sm text-muted-foreground">Rutex Jupeb Master is now installed on your device. Go to your home screen to open it.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Rutex Jupeb Master</h1>
          <p className="text-sm text-muted-foreground">
            Install as a PWA for offline access and faster loading
          </p>
        </div>

        <div className="bg-card rounded-2xl border shadow-xl p-6 space-y-6">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {isIOS
                ? "Use the steps below to add to your home screen"
                : "Open this page in Chrome or Edge to enable one-tap install"}
            </p>
          </div>

          <button
            onClick={deferredPrompt ? handleInstall : undefined}
            disabled={installing}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.97] shadow-lg"
          >
            {installing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            {installing ? "Installing..." : "Install App"}
          </button>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Manual Steps</h2>

            {isIOS ? (
              <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                <p className="font-medium text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" /> iOS
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">1</span>
                    <span>Tap <span className="font-medium text-foreground"><Share2 className="h-3.5 w-3.5 inline" /></span> (Share)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">2</span>
                    <span>Scroll down and tap <span className="font-medium text-foreground">Add to Home Screen</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">3</span>
                    <span>Tap <span className="font-medium text-foreground">Add</span> (top right)</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                <p className="font-medium text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" /> Android / Desktop
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">1</span>
                    <span>Tap <span className="font-medium text-foreground">⋮</span> (menu) in your browser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">2</span>
                    <span>Tap <span className="font-medium text-foreground">Add to Home screen</span> / <span className="font-medium text-foreground">Install</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">3</span>
                    <span>Tap <span className="font-medium text-foreground">Add</span> / <span className="font-medium text-foreground">Install</span></span>
                  </li>
                </ol>
              </div>
            )}

            {!isAndroid && !isIOS && (
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(APP_URL)}`}
                  alt="QR Code"
                  className="w-40 h-40 rounded-xl"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" /> PWA Benefits
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><Plus className="h-3 w-3 text-primary" /> Works offline</li>
                <li className="flex items-center gap-1.5"><Plus className="h-3 w-3 text-primary" /> Faster loading</li>
                <li className="flex items-center gap-1.5"><Plus className="h-3 w-3 text-primary" /> App icon on your home screen</li>
                <li className="flex items-center gap-1.5"><Plus className="h-3 w-3 text-primary" /> Push notification support</li>
              </ul>
            </div>

            <a
              href="/"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl border border-border hover:bg-muted/50 transition-all"
            >
              <Zap className="h-4 w-4" />
              Open Web App
            </a>
          </div>
        </div>

        <div className="text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4">
            Back to home
          </a>
        </div>
      </motion.div>
    </div>
  );
}