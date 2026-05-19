import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Monitor, CheckCircle, Loader2 } from "lucide-react";

const GITHUB_REPO = "abdulrazaqafolarin-droid/jupebstudyguide-main";
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

function getPlatform(): "android" | "ios" | "desktop" {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  return "desktop";
}

export default function DownloadApp() {
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.tag_name) setLatestVersion(data.tag_name);
      })
      .catch(() => {});
  }, []);

  const downloadAPK = () => {
    setDownloading(true);
    window.open(`${RELEASES_URL}/latest/download/app-debug.apk`, "_blank");
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
            Download the native Android app for the best experience
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
                {downloading ? "Downloading..." : "Download APK"}
              </button>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                {latestVersion && (
                  <p>Latest version: {latestVersion}</p>
                )}
                <p>Version 1.0.0 | ~15MB | Android 8.0+</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border text-xs space-y-1.5">
                <p className="font-medium">Installation steps:</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                  <li>Tap "Download APK" above</li>
                  <li>Open the downloaded file</li>
                  <li>Tap "Install anyway" if prompted</li>
                  <li>Open JUPEB Master from your app drawer</li>
                </ol>
              </div>
            </div>
          ) : platform === "ios" ? (
            <div className="text-center space-y-3 py-4">
              <Monitor className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                iOS app coming soon. For now, use the web app or install it as a PWA:
              </p>
              <ol className="text-xs text-left text-muted-foreground list-decimal list-inside space-y-1">
                <li>Tap Share button <span className="font-medium">(square with arrow)</span></li>
                <li>Scroll down and tap <span className="font-medium">Add to Home Screen</span></li>
                <li>Tap <span className="font-medium">Add</span></li>
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
                You're on a desktop. Scan this QR code from your Android phone to download:
              </p>
              <div className="flex justify-center">
                <div className="w-40 h-40 bg-muted rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                  QR code placeholder
                </div>
              </div>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download APK (Desktop)
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
