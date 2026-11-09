import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jupeb.master',
  appName: 'Rutex Master(Jupeb)',
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
      // Do not let the status bar overlap the WebView on Android 14 and below.
      // Android 15+ enforces edge-to-edge and is handled in MainActivity.
      overlaysWebView: false,
      style: 'dark',
      backgroundColor: '#0f0f1a',
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
