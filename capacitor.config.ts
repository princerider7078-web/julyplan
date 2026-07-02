import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julyplan.app',
  appName: 'July Plan',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Allow the WebView to make cross-origin requests to Vercel backend
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#1a1410',
    // Required for fetch() to external domains (Vercel) from WebView
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#f97316',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
