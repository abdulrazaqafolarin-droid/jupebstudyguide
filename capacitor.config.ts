import { CapacitorConfig } from '@capacitor/cli';
import { env } from 'node:process';

// Keep the installed JUPEB identity as the default. A deliberately isolated
// successor build may supply a distinct app ID/name through CI environment
// variables; local/production builds remain unchanged without those overrides.
const appId = env.CAPACITOR_APP_ID || 'com.jupeb.master';
const appName = env.CAPACITOR_APP_NAME || 'Rutex Master(Jupeb)';

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'dist',
  // NOTE: no server.url — the app bundles dist locally so it opens instantly
  // without depending on a remote URL (Supabase data still needs internet).
  androidScheme: 'https',
  plugins: {
    PushNotifications: {
      // Empty: the plugin must NOT paint its own notification while the app
      // is foregrounded — the in-app banner owns that moment (WhatsApp rule),
      // and the system shade is FCM's job when backgrounded/closed.
      presentationOptions: [],
    },
    LocalNotifications: {
      // Status-bar glyph (white mortarboard in res/drawable) + accent tint
      // matching the app's amber primary.
      smallIcon: 'ic_stat_rutex',
      iconColor: '#E19209',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#14171c',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      // Keep the WebView below the status bar on Android 14 and earlier.
      // Android 15+ is handled by MainActivity's native window-inset listener.
      overlaysWebView: false,
      style: 'dark',
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
