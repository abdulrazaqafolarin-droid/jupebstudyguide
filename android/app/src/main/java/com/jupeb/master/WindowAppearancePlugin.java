package com.jupeb.master;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the surface visible behind transparent Android system bars aligned
 * with the active web-app theme. On Android 15+, setStatusBarColor is ignored
 * by edge-to-edge enforcement, so the decor background supplies that surface.
 */
@CapacitorPlugin(name = "WindowAppearance")
public class WindowAppearancePlugin extends Plugin {

    @PluginMethod
    public void setSystemBarSurface(PluginCall call) {
        String rawColor = call.getString("color");
        if (rawColor == null || !rawColor.matches("^#[0-9a-fA-F]{6}$")) {
            call.reject("A six-digit hex colour is required");
            return;
        }

        final int surfaceColor;
        try {
            surfaceColor = Color.parseColor(rawColor);
        } catch (IllegalArgumentException error) {
            call.reject("Invalid system-bar surface colour", error);
            return;
        }

        Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            call.reject("The Android activity is not available");
            return;
        }

        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) {
                call.reject("The Android activity is closing");
                return;
            }

            Window window = activity.getWindow();
            window.getDecorView().setBackgroundColor(surfaceColor);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                window.setStatusBarColor(surfaceColor);
            }
            call.resolve();
        });
    }
}
