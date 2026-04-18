import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luxecuts.app',
  appName: 'Luxe Cuts',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#050505",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      iosSpinnerStyle: "small",
      showSpinner: false,
    },
  },
};

export default config;
