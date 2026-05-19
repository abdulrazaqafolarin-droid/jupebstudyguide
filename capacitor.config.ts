import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jupeb.master',
  appName: 'JUPEB Master',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
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
