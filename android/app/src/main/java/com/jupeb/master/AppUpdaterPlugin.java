package com.jupeb.master;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Powers the in-app updater for the sideloaded APK (Play's in-app-update
 * API only works for Play-installed apps, so we do it ourselves):
 * read the installed versionCode, stream releases into private cache storage,
 * verify the file, and fire the Android package installer.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String RELEASE_APK_URL =
        "https://gzyczowqqywesqhqqpdi.supabase.co/storage/v1/object/public/app-releases/jupeb-master.apk";
    private static final long MAX_APK_BYTES = 200L * 1024L * 1024L;
    private final ExecutorService downloadExecutor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloadInProgress = new AtomicBoolean(false);

    @Override
    protected void handleOnDestroy() {
        downloadExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        Integer versionCode = call.getInt("versionCode");
        if (!RELEASE_APK_URL.equals(url) || versionCode == null || versionCode < 1) {
            call.reject("Invalid APK release request");
            return;
        }
        if (!downloadInProgress.compareAndSet(false, true)) {
            call.reject("An APK download is already in progress");
            return;
        }

        try {
            downloadExecutor.execute(() -> {
            HttpURLConnection connection = null;
            File partial = null;
            try {
                File updateDirectory = new File(getContext().getCacheDir(), "updates");
                if (!updateDirectory.isDirectory() && !updateDirectory.mkdirs()) {
                    throw new IllegalStateException("Could not create the private update directory");
                }

                File target = new File(updateDirectory, "jupeb-master-" + versionCode + ".apk");
                File[] staleFiles = updateDirectory.listFiles((directory, name) ->
                    name.startsWith("jupeb-master-") && name.endsWith(".apk")
                );
                if (staleFiles == null) {
                    throw new IllegalStateException("Could not inspect the private update directory");
                }
                for (File stale : staleFiles) {
                    if (stale.exists() && !stale.delete()) {
                        throw new IllegalStateException("Could not remove an older APK download");
                    }
                }
                // Keep the temporary archive's final extension as .apk so
                // Android's package parser can inspect it before finalization.
                partial = new File(updateDirectory, target.getName().replace(".apk", ".part.apk"));

                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(30_000);
                connection.setReadTimeout(120_000);
                connection.setUseCaches(false);
                connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
                connection.connect();

                int responseCode = connection.getResponseCode();
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    throw new IllegalStateException("APK server returned HTTP " + responseCode);
                }

                long contentLength = connection.getContentLengthLong();
                if (contentLength > MAX_APK_BYTES) {
                    throw new IllegalStateException("APK exceeds the maximum permitted download size");
                }

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long downloaded = 0L;
                long lastProgressAt = 0L;
                byte[] buffer = new byte[64 * 1024];

                try (InputStream input = new BufferedInputStream(connection.getInputStream());
                     FileOutputStream output = new FileOutputStream(partial)) {
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        downloaded += read;
                        if (downloaded > MAX_APK_BYTES || (contentLength > 0 && downloaded > contentLength)) {
                            throw new IllegalStateException("APK download exceeded its expected size");
                        }
                        output.write(buffer, 0, read);
                        digest.update(buffer, 0, read);

                        long now = System.currentTimeMillis();
                        if (now - lastProgressAt >= 120L) {
                            notifyDownloadProgress(url, downloaded, contentLength);
                            lastProgressAt = now;
                        }
                    }
                    output.flush();
                    output.getFD().sync();
                }

                if (downloaded <= 0L || (contentLength > 0 && downloaded != contentLength)) {
                    throw new IllegalStateException("APK download was empty or incomplete");
                }

                int signatureFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? PackageManager.GET_SIGNING_CERTIFICATES
                    : PackageManager.GET_SIGNATURES;
                PackageInfo archiveInfo = getContext().getPackageManager()
                    .getPackageArchiveInfo(partial.getAbsolutePath(), signatureFlags);
                if (archiveInfo == null
                        || !getContext().getPackageName().equals(archiveInfo.packageName)) {
                    throw new IllegalStateException("Downloaded file is not a JUPEB Master APK");
                }
                long archiveVersionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? archiveInfo.getLongVersionCode()
                    : archiveInfo.versionCode;
                if (archiveVersionCode != versionCode) {
                    throw new IllegalStateException("APK version does not match the published release");
                }
                verifyUpdateSigningCertificate(archiveInfo, signatureFlags);

                StringBuilder actualHash = new StringBuilder(64);
                for (byte value : digest.digest()) {
                    actualHash.append(String.format(java.util.Locale.ROOT, "%02x", value & 0xff));
                }

                JSObject result = new JSObject();
                result.put("filePath", target.getAbsolutePath());
                result.put("bytes", downloaded);
                result.put("sha256", actualHash.toString());

                if (!partial.renameTo(target)) {
                    throw new IllegalStateException("Could not finalize the downloaded APK");
                }
                partial = null;
                notifyDownloadProgress(url, downloaded, contentLength > 0 ? contentLength : downloaded);
                call.resolve(result);
            } catch (Exception e) {
                if (partial != null && partial.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    partial.delete();
                }
                call.reject(e.getMessage() == null ? "APK download failed" : e.getMessage(), e);
            } finally {
                if (connection != null) connection.disconnect();
                downloadInProgress.set(false);
            }
            });
        } catch (RuntimeException e) {
            downloadInProgress.set(false);
            call.reject("Could not start APK download", e);
        }
    }

    /**
     * Android only installs an APK update when its signing certificates are
     * compatible with the installed package. Check before showing the system
     * installer so a debug/release-key mismatch becomes a clear in-app error.
     *
     * This intentionally requires an exact current-signer match. A deliberate
     * signing-key rotation needs a separately reviewed signing-lineage path.
     */
    private void verifyUpdateSigningCertificate(PackageInfo archiveInfo, int flags)
            throws PackageManager.NameNotFoundException {
        PackageManager packageManager = getContext().getPackageManager();
        PackageInfo installedInfo = packageManager.getPackageInfo(
            getContext().getPackageName(), flags
        );

        Signature[] archiveSigners;
        Signature[] installedSigners;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            SigningInfo archiveSigningInfo = archiveInfo.signingInfo;
            SigningInfo installedSigningInfo = installedInfo.signingInfo;
            if (archiveSigningInfo == null || installedSigningInfo == null) {
                throw new IllegalStateException("Could not verify the APK signing certificate");
            }
            if (archiveSigningInfo.hasMultipleSigners()
                    != installedSigningInfo.hasMultipleSigners()) {
                throw new IllegalStateException("Downloaded APK uses incompatible signing certificates");
            }
            archiveSigners = archiveSigningInfo.getApkContentsSigners();
            installedSigners = installedSigningInfo.getApkContentsSigners();
        } else {
            archiveSigners = archiveInfo.signatures;
            installedSigners = installedInfo.signatures;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            SigningInfo archiveSigningInfo = archiveInfo.signingInfo;
            SigningInfo installedSigningInfo = installedInfo.signingInfo;
            if (archiveSigningInfo == null || installedSigningInfo == null) {
                throw new IllegalStateException("Could not verify the APK signing certificate");
            }

            boolean archiveHasMultipleSigners = archiveSigningInfo.hasMultipleSigners();
            boolean installedHasMultipleSigners = installedSigningInfo.hasMultipleSigners();
            if (archiveHasMultipleSigners || installedHasMultipleSigners) {
                if (!archiveHasMultipleSigners || !installedHasMultipleSigners
                        || !haveSameSigningCertificates(archiveSigningInfo.getApkContentsSigners(),
                                                       installedSigningInfo.getApkContentsSigners())) {
                    throw new IllegalStateException(
                        "Downloaded APK uses incompatible multiple signing certificates"
                    );
                }
                return;
            }

            Signature[] archiveHistory = archiveSigningInfo.getSigningCertificateHistory();
            Signature[] archiveCurrentSigners = archiveSigningInfo.getApkContentsSigners();
            Signature[] installedCurrentSigners = installedSigningInfo.getApkContentsSigners();

            if (archiveHistory == null || archiveHistory.length == 0
                    || archiveCurrentSigners == null || archiveCurrentSigners.length != 1
                    || installedCurrentSigners == null || installedCurrentSigners.length != 1
                    || !archiveHistory[archiveHistory.length - 1].equals(archiveCurrentSigners[0])) {
                throw new IllegalStateException("Downloaded APK has an invalid signing certificate lineage");
            }

            // A legitimate rotation carries a platform-verified proof-of-rotation.
            // The installed certificate must appear in the candidate APK's history.
            // PackageInstaller performs the authoritative lineage/capability check
            // when the user confirms the update, including the rollback restriction.
            if (!containsCertificate(archiveHistory, installedCurrentSigners[0])) {
                throw new IllegalStateException(
                    "This update is not signed by the installed app's certificate or a verified descendant"
                );
            }
            return;
        }

        if (!haveSameSigningCertificates(archiveSigners, installedSigners)) {
            throw new IllegalStateException(
                "This update is signed with a different key from the installed app. " +
                "Android versions before 9 do not support signing-key rotation; " +
                "a same-key update or a backed-up reinstall is required."
            );
        }
    }

    private boolean containsCertificate(Signature[] certificates, Signature expected) {
        if (certificates == null || expected == null) return false;
        for (Signature certificate : certificates) {
            if (expected.equals(certificate)) return true;
        }
        return false;
    }

    private boolean haveSameSigningCertificates(Signature[] left, Signature[] right) {
        if (left == null || right == null || left.length == 0 || left.length != right.length) {
            return false;
        }

        Set<String> leftCertificates = new HashSet<>();
        for (Signature signature : left) {
            if (signature == null) return false;
            leftCertificates.add(signature.toCharsString());
        }
        for (Signature signature : right) {
            if (signature == null || !leftCertificates.remove(signature.toCharsString())) {
                return false;
            }
        }
        return leftCertificates.isEmpty();
    }

    private void notifyDownloadProgress(String url, long bytes, long contentLength) {
        JSObject status = new JSObject();
        status.put("url", url);
        status.put("bytes", bytes);
        status.put("contentLength", contentLength);
        status.put("lengthComputable", contentLength > 0);
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> notifyListeners("downloadProgress", status));
        }
    }

    @PluginMethod
    public void deleteDownloadedApk(PluginCall call) {
        String filePath = call.getString("filePath");
        try {
            File apk = resolveManagedUpdateFile(filePath);
            if (apk.exists() && !apk.delete()) {
                call.reject("Could not remove the failed APK download");
                return;
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Invalid updater file path", e);
        }
    }

    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            JSObject ret = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ret.put("versionCode", info.getLongVersionCode());
            } else {
                ret.put("versionCode", info.versionCode);
            }
            ret.put("versionName", info.versionName);
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("package not found", e);
        }
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        boolean can = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            can = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("canInstall", can);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (android.content.ActivityNotFoundException e) {
            call.reject("Android install-permission settings are unavailable", e);
        } catch (SecurityException e) {
            call.reject("Cannot open Android install-permission settings", e);
        }
    }

    @PluginMethod
    public void getFileSha256(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("filePath is required");
            return;
        }

        File apk;
        try {
            apk = resolveManagedUpdateFile(filePath);
        } catch (IllegalArgumentException e) {
            call.reject("APK path must be a local app file", e);
            return;
        }
        if (!apk.isFile() || !apk.canRead()) {
            call.reject("APK file is unavailable");
            return;
        }

        try (FileInputStream input = new FileInputStream(apk)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            StringBuilder hex = new StringBuilder(64);
            for (byte b : digest.digest()) {
                hex.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
            }
            JSObject result = new JSObject();
            result.put("sha256", hex.toString());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not verify downloaded APK", e);
        }
    }


    /**
     * Accept only APKs inside this app's private updater cache directory.
     * Canonical paths prevent traversal and content:// paths are never accepted.
     */
    private File resolveManagedUpdateFile(String rawPath) {
        if (rawPath == null || rawPath.trim().isEmpty()) {
            throw new IllegalArgumentException("filePath is required");
        }
        Uri uri = Uri.parse(rawPath);
        String scheme = uri.getScheme();
        File candidate;
        if (scheme == null) {
            candidate = new File(rawPath);
        } else if ("file".equalsIgnoreCase(scheme) && uri.getPath() != null) {
            candidate = new File(uri.getPath());
        } else {
            throw new IllegalArgumentException("Only local file paths are supported");
        }

        File updateDirectory;
        File canonical;
        try {
            updateDirectory = new File(getContext().getCacheDir(), "updates").getCanonicalFile();
            canonical = candidate.getCanonicalFile();
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not resolve the updater file path", e);
        }
        File parent = canonical.getParentFile();
        if (parent == null || !parent.equals(updateDirectory)
                || !canonical.getName().matches("jupeb-master-[0-9]+\\.apk")) {
            throw new IllegalArgumentException("APK must be inside the private updater directory");
        }
        return canonical;
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("filePath is required");
            return;
        }
        File apk;
        try {
            apk = resolveManagedUpdateFile(filePath);
        } catch (IllegalArgumentException e) {
            call.reject("APK path must be a local app file", e);
            return;
        }
        if (!apk.isFile() || !apk.canRead()) {
            call.reject("APK file not found or cannot be read");
            return;
        }
        try {
            String authority = getContext().getPackageName() + ".fileprovider";
            Uri uri = FileProvider.getUriForFile(getContext(), authority, apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(intent);
            call.resolve();
        } catch (IllegalArgumentException e) {
            call.reject("cannot share APK file", e);
        } catch (android.content.ActivityNotFoundException e) {
            call.reject("no installer found", e);
        } catch (SecurityException e) {
            call.reject("Android denied access to the APK installer. Check install permissions and try again.", e);
        }
    }
}
