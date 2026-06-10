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
    // Allows Supabase wss:// connections
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: "automatic",
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
