package com.jupeb.master;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Powers the in-app updater for the sideloaded APK (Play's in-app-update
 * API only works for Play-installed apps, so we do it ourselves):
 * read the installed versionCode, and fire the system package installer
 * for an APK the web layer downloaded into our cache dir.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

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
    public void installApk(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("filePath is required");
            return;
        }
        File apk = new File(filePath);
        if (!apk.exists()) {
            call.reject("APK file not found");
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
        }
    }
}
