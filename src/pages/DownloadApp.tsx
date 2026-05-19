import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Monitor, CheckCircle, Loader2, Shield, Zap } from "lucide-react";

const GITHUB_REPO = "abdulrazaqafolarin-droid/jupebstudyguide";
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
const APP_URL = "https://jupebstudyguide-main.vercel.app";

function getPlatform(): "android" | "ios" | "desktop" {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  return "desktop";
}

export default function DownloadApp() {
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [versionFound, setVersionFound] = useState(false);
  const [versionLoading, setVersionLoading] = useState(true);
  const [versionError, setVersionError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
    setVersionLoading(true);
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.tag_name) {
          setLatestVersion(data.tag_name);
          setVersionFound(true);
        }
        setVersionLoading(false);
      })
      .catch(() => { setVersionError(true); setVersionLoading(false); });
  }, []);

  const downloadAPK = () => {
    setDownloading(true);
    const apkUrl = versionFound
      ? `${RELEASES_URL}/latest/download/app-debug.apk`
      : `${RELEASES_URL}`;
    window.open(apkUrl, "_blank");
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <Smartphone className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">JUPEB Master App</h1>
          <p className="text-sm text-muted-foreground">
            Get the best experience with the native Android app or PWA
          </p>
        </div>

        <div className="bg-card rounded-2xl border shadow-xl p-6 space-y-4">
          {platform === "android" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your device is ready for the native app
                </p>
              </div>

              <button
                onClick={downloadAPK}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.97] shadow-lg"
              >
                {downloading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {downloading ? "Opening..." : "Download APK"}
              </button>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                {versionLoading && <p className="animate-pulse">Checking for latest version...</p>}
                {!versionLoading && latestVersion && <p>Latest version: {latestVersion}</p>}
                {!versionLoading && !versionFound && !versionError && <p>No release found yet — APK is being built via CI</p>}
                {versionError && <p>Could not check for updates. Default APK link will be used.</p>}
                <p>Version 1.0.0 | ~15MB | Android 8.0+</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border text-xs space-y-1.5">
                <p className="font-medium flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Installation steps:
                </p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                  <li>Tap "Download APK" above</li>
                  <li>Open the downloaded file when ready</li>
                  <li>Tap "Install anyway" if prompted by Play Protect</li>
                  <li>Open JUPEB Master from your app drawer</li>
                </ol>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or use PWA</span>
                </div>
              </div>

              <button
                onClick={() => window.location.href = "/"}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl border border-border hover:bg-muted/50 transition-all"
              >
                <Zap className="h-4 w-4 text-primary" />
                Open Web App (Add to Home Screen)
              </button>
            </div>
          ) : platform === "ios" ? (
            <div className="text-center space-y-3 py-4">
              <Monitor className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                iOS app coming soon. For now, use the PWA:
              </p>
              <ol className="text-xs text-left text-muted-foreground list-decimal list-inside space-y-1">
                <li>Tap Share <span className="font-medium">(square with arrow)</span></li>
                <li>Scroll down and tap <span className="font-medium">Add to Home Screen</span></li>
                <li>Tap <span className="font-medium">Add</span> (top right)</li>
              </ol>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continue to Web App
              </a>
            </div>
          ) : (
            <div className="text-center space-y-3 py-4">
              <Monitor className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You're on a desktop. Open this page on your Android phone, or scan:
              </p>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(APP_URL + "/download")}`}
                  alt="QR Code to download page"
                  className="w-40 h-40 rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                View Releases on GitHub
              </a>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Open Web App
              </a>
            </div>
          )}
        </div>

        <div className="text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4">
            Back to web app
          </a>
        </div>
      </motion.div>
    </div>
  );
}
