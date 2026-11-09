package com.jupeb.master;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    public static volatile boolean isAppForeground = false;
    private int statusBarInsetPx = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The preview package must never offer the production APK as an update.
        if (!getPackageName().endsWith(".preview")) {
            registerPlugin(AppUpdaterPlugin.class);
        }
        super.onCreate(savedInstanceState);

        // Draw edge-to-edge on every supported Android version. Android 15+
        // enforces this for target SDK 35+, while older versions need the
        // explicit window setting. The status bar itself is fully transparent.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().getDecorView().setBackgroundColor(Color.TRANSPARENT);

        // Apply the measured inset after each WebView page load as well as
        // whenever Android reports new window insets (rotation/resume).
        if (getBridge() != null) {
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    applyStatusBarInsetToWebView(webView);
                }
            });
        }

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

                // Keep side-cutout protection at the native layer. The top
                // inset is consumed in CSS so the WebView can paint behind
                // the transparent status bar without putting controls there.
                statusBarInsetPx = topInsets.top;
                view.setPadding(
                    baseLeft + safeInsets.left,
                    baseTop,
                    baseRight + safeInsets.right,
                    baseBottom + safeInsets.bottom
                );

                if (getBridge() != null) {
                    applyStatusBarInsetToWebView(getBridge().getWebView());
                }
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(appContent);
        }
    }

    private void applyStatusBarInsetToWebView(WebView webView) {
        if (webView == null) {
            return;
        }

        String script = "document.documentElement.style.setProperty("
            + "'--native-status-bar-inset', '" + Math.max(0, statusBarInsetPx) + "px');";
        webView.post(() -> webView.evaluateJavascript(script, null));
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
