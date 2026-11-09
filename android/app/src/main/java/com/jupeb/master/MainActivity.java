package com.jupeb.master;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

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

        // Use one edge-to-edge path on Android 7 through current Android.
        // The status bar is genuinely transparent; the WebView draws the app
        // canvas behind it, while CSS consumes the measured top safe inset.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().getDecorView().setBackgroundColor(Color.TRANSPARENT);

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
                Insets topInsets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.statusBars()
                        | WindowInsetsCompat.Type.displayCutout()
                );

                // Keep horizontal cutout protection at the native view layer.
                // Do not add top padding here: that would expose the native
                // window background instead of the WebView behind the bar.
                view.setPadding(
                    baseLeft + safeInsets.left,
                    baseTop,
                    baseRight + safeInsets.right,
                    baseBottom
                );

                applyStatusBarInsetToWebView(topInsets.top);
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(appContent);
        }
    }

    private void applyStatusBarInsetToWebView(int insetPx) {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        String script = "document.documentElement.style.setProperty("
            + "'--native-status-bar-inset', '" + Math.max(0, insetPx) + "px');";
        getBridge().getWebView().post(
            () -> getBridge().getWebView().evaluateJavascript(script, null)
        );
    }

    @Override
    public void onResume() {
        super.onResume();
        isAppForeground = true;
        View appContent = findViewById(android.R.id.content);
        if (appContent != null) {
            ViewCompat.requestApplyInsets(appContent);
        }
    }

    @Override
    public void onPause() {
        isAppForeground = false;
        super.onPause();
    }
}
