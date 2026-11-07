import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.bulwer.shoppinglist',
  appName: 'Basket',
  webDir: 'dist',
  android: {
    backgroundColor: '#111413',
    // Keep the web view clear of the status and navigation bars on Android 15+.
    adjustMarginsForEdgeToEdge: 'force',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#111413',
      style: 'DARK',
    },
  },
};

export default config;
