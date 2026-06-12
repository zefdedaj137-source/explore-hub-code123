import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shqiponja.app",
  appName: "Shqiponja",
  webDir: "dist",
  server: {
    // In development, point to local Vite dev server for live reload.
    // Comment this out for production builds.
    // url: "http://192.168.x.x:8080",
    // cleartext: true,
  },
  ios: {
    allowsLinkPreview: false,
    // Disable native scroll bounce — the app manages its own scroll areas
    scrollEnabled: false,
    contentInset: "never",
    // Allow video/audio to play inline without going full-screen (calls, GIFs)
    allowsInlineMediaPlayback: true,
    // Suppress iOS text-size adjustment when orientation changes
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    // Capacitor HTTP — allows all HTTPS requests (Supabase, etc.)
    CapacitorHttp: {
      enabled: true,
    },
    // Status bar — dark content on light background
    StatusBar: {
      style: "Dark",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
