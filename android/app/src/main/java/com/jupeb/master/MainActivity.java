package com.jupeb.master;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

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
        registerPlugin(WindowAppearancePlugin.class);
        super.onCreate(savedInstanceState);

        // Prevent Android screenshots, screen recordings, and recent-app
        // preview capture from exposing protected study content.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);

        final int initialSurface = Color.parseColor("#14171c");
        getWindow().getDecorView().setBackgroundColor(initialSurface);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            // Android 14 and earlier are more stable with the system reserving
            // the status/navigation bar areas. The StatusBar plugin supplies
            // the active theme colour and icon contrast without WebView offsets.
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            return;
        }

        // Android 15+ enforces edge-to-edge for apps targeting API 35+.
        // Apply insets to the native content container before its first draw;
        // never wait for WebView JavaScript or a page-load callback to move UI.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);

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

                // Always derive from the original padding. Repeated inset
                // dispatches (resume, rotation, split-screen) therefore cannot
                // accumulate padding or make the app jump progressively.
                view.setPadding(
                    baseLeft + safeInsets.left,
                    baseTop + safeInsets.top,
                    baseRight + safeInsets.right,
                    baseBottom + safeInsets.bottom
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            View appContent = findViewById(android.R.id.content);
            if (appContent != null) {
                ViewCompat.requestApplyInsets(appContent);
            }
        }
    }

    @Override
    public void onPause() {
        isAppForeground = false;
        super.onPause();
    }
}
