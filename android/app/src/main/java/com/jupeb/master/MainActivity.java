package com.jupeb.master;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
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

        // Android 15+ enforces edge-to-edge for apps targeting API 35+.
        // Keep the Capacitor WebView inside the status-bar/cutout safe area so
        // the first row of the app remains visible and interactive.
        View appContent = findViewById(android.R.id.content);
        if (appContent != null) {
            ViewCompat.setOnApplyWindowInsetsListener(appContent, (view, windowInsets) -> {
                Insets safeInsets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.statusBars()
                        | WindowInsetsCompat.Type.displayCutout()
                );
                view.setPadding(
                    safeInsets.left,
                    safeInsets.top,
                    safeInsets.right,
                    0
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
