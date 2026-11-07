package com.jupeb.master;

import android.os.Bundle;
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
