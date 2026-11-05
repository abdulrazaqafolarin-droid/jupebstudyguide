import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Smartphone, Monitor, CheckCircle, Loader2, Shield, Zap } from "lucide-react";
import { fetchLatestRelease, getInstalledVersion, isNewer } from "@/lib/app-updater";

// Direct, no-login download (APK is mirrored to public Supabase storage on
// every release; the GitHub repo is private so its release assets 404 for guests).
const APK_URL =
  "https://gzyczowqqywesqhqqpdi.supabase.co/storage/v1/object/public/app-releases/jupeb-master.apk";
const APK_INFO = "Latest build • ~10 MB • Android 8.0+";
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
  const [releaseAvailable, setReleaseAvailable] = useState(false);
  const [requiresReinstall, setRequiresReinstall] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
    // The mirror workflow publishes version.json next to the APK, so the
    // page can show the real version instead of a static label.
    void Promise.all([fetchLatestRelease(), getInstalledVersion()]).then(([release, installed]) => {
      if (release) {
        const migrationRequiresReinstall = release.requiresReinstall === true &&
          (!installed || isNewer(installed.versionCode, release.versionCode));
        setRequiresReinstall(migrationRequiresReinstall);
        // The download page is the explicit clean-install path. The native
        // updater still blocks this release from being installed over the old
        // package; the page explains the data-loss consequence before download.
        setReleaseAvailable(true);
        const date = release.builtAt ? new Date(release.builtAt) : null;
        setLatestVersion(
          `v${release.versionName}` +
            (date && !Number.isNaN(date.getTime())
              ? ` · ${date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`
              : ""),
        );
      } else {
        // Never offer an APK when its release metadata is missing, malformed,
        // unsigned by a known key, or lacks the checksum required by the updater.
        setReleaseAvailable(false);
        setLatestVersion("Temporarily unavailable");
        setRequiresReinstall(false);
      }
    });
  }, []);

  const downloadAPK = () => {
    if (!releaseAvailable) return;
    setDownloading(true);
    window.open(APK_URL, "_blank");
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

              {requiresReinstall && (
                <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Fresh installation required</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This release is signed with the new permanent key. Android will not install it over the older app.
                    Download this APK first, then uninstall the old JUPEB Master app before installing the new one.
                    Uninstalling permanently deletes any study progress, syllabus sessions, streaks or bookmarks saved only
                    on that phone. Supabase account records remain online, but they are not a complete copy of phone-only data.
                    Continue only if you accept that loss.
                  </p>
                </div>
              )}
              {releaseAvailable ? (
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
                  {downloading ? "Opening..." : requiresReinstall ? "Download Fresh APK" : "Download APK"}
                </button>
              ) : (
                <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground">
                  {requiresReinstall
                    ? "The APK download is intentionally disabled until device-only learning data can be transferred safely. Keep your current app installed and use the web app below when needed."
                    : "The Android installer is temporarily unavailable while its signing and integrity details are verified. Your existing app and account data are unaffected. Use the web app below for now."}
                </div>
              )}

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>Latest version: {latestVersion ?? "Checking…"}</p>
                {releaseAvailable && <p>{APK_INFO}</p>}
              </div>

              {requiresReinstall ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                  <p className="font-medium flex items-center gap-1.5 text-foreground">
                    <Shield className="h-3 w-3" /> Fresh-install steps
                  </p>
                  <ol className="mt-1 list-decimal list-inside space-y-0.5">
                    <li>Download the new APK above.</li>
                    <li>Only when ready, uninstall the older JUPEB Master app.</li>
                    <li>Open the downloaded APK and install it.</li>
                    <li>Sign in with the same account to restore cloud-backed records.</li>
                  </ol>
                  <p className="mt-2">Do not uninstall until the APK has fully downloaded. Phone-only records that never synced will be lost.</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-muted/50 border text-xs space-y-1.5">
                  <p className="font-medium flex items-center gap-1.5">
                    <Shield className="h-3 w-3" /> Installation steps:
                  </p>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                    <li>Tap "Download APK" above</li>
                    <li>Open the downloaded file when ready</li>
                    <li>Tap "Install anyway" if prompted by Play Protect</li>
                    <li>Open JUPEB Master and sign in again</li>
                  </ol>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or use PWA</span>
                </div>
              </div>

              <Link
                to="/"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl border border-border hover:bg-muted/50 transition-all"
              >
                <Zap className="h-4 w-4 text-primary" />
                Open Web App (Add to Home Screen)
              </Link>
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
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              {releaseAvailable ? (
                <a
                  href={APK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download APK for Android
                </a>
              ) : (
                <p role="status" className="text-xs text-muted-foreground">
                  {requiresReinstall
                    ? "The fresh-install APK is not available yet. Keep the older app installed until the new APK download is ready."
                    : "The Android installer is temporarily unavailable while its signing and integrity details are verified."}
                </p>
              )}
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
