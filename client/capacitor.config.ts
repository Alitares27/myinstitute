import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gestionar.institute",
  appName: "GestionAR",
  webDir: "dist",
  server: {
    hostname: "localhost",
    androidScheme: "https",
  },
  backgroundColor: "#F2F2F7",
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: "#6750A4",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DEFAULT",
      backgroundColor: "#6750A4",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
