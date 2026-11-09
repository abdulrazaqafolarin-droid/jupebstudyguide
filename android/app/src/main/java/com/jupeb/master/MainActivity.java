package com.jupeb.master;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.graphics.Color;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static volatile boolean isAppForeground = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The preview package must never offer the production APK as an update.
        if (!getPackageName().endsWith(".preview")) {
            registerPlugin(AppUpdaterPlugin.class);
        }
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            // On Android 14 and earlier, let the status bar occupy its normal
            // space. The Capacitor StatusBar plugin is configured with
            // overlaysWebView=false, so the WebView must not draw underneath it.
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
            return;
        }

        // Android 15+ enforces edge-to-edge for apps targeting API 35+.
        // Keep that behavior, but inset the content container so the WebView
        // starts below the clock, battery icons, and any camera/display cutout.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#14171c"));

        View appContent = findViewById(android.R.id.content);
        if (appContent != null) {
            final int baseLeft = appContent.getPaddingLeft();
            final int baseTop = appContent.getPaddingTop();
            final int baseRight = appContent.getPaddingRight();
            final int baseBottom = appContent.getPaddingBottom();

            ViewCompat.setOnApplyWindowInsetsListener(appContent, (view, windowInsets) -> {
                Insets safeInsets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                        | WindowInsetsCompat.Type.displayCutout()
                );
                view.setPadding(
                    baseLeft + safeInsets.left,
                    baseTop + safeInsets.top,
                    baseRight + safeInsets.right,
                    baseBottom
                );
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(appContent);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        isAppForeground = true;
    }

    @Override
    public void onPause() {
        isAppForeground = false;
        super.onPause();
    }
}
