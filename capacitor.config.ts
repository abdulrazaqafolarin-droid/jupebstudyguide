import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jupeb.master',
  appName: 'Rutex Master(JUPEB)',
  webDir: 'dist',
  // NOTE: no server.url — the app bundles dist locally so it opens instantly
  // without depending on a remote URL (Supabase data still needs internet).
  androidScheme: 'https',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      // Status-bar glyph (white mortarboard in res/drawable) + accent tint
      // matching the app's amber primary.
      smallIcon: 'ic_stat_rutex',
      iconColor: '#E19209',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f0f1a',
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
