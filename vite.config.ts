import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { readFileSync } from "fs";

/** Vite plugin: stamps sw.js cache names with the build timestamp so new
 *  deployments automatically invalidate the previous cache without a manual bump. */
function swCacheVersionPlugin(): import("vite").Plugin {
  const buildTime = Date.now().toString(36); // short base-36 timestamp
  return {
    name: "sw-cache-version",
    apply: "build",
    generateBundle(_opts, bundle) {
      const swAsset = bundle["sw.js"];
      if (swAsset && swAsset.type === "asset" && typeof swAsset.source === "string") {
        swAsset.source = swAsset.source
          .replace(/"shqiponja-v[^"]+"/, `"shqiponja-${buildTime}"`)
          .replace(/"shqiponja-api-v[^"]+"/, `"shqiponja-api-${buildTime}"`);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      // clientPort: 443, // Uncomment when using ngrok HTTPS
    },
    allowedHosts: [".ngrok-free.dev", ".ngrok.io", ".ngrok.app", "localhost"],
  },
  plugins: [react(), swCacheVersionPlugin(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production optimizations
    minify: "esbuild", // Use esbuild minification
    // Code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-slider",
            "@radix-ui/react-switch",
          ],
          icons: ["lucide-react"],
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query"],
          i18n: ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          utils: ["date-fns", "clsx", "class-variance-authority"],
        },
      },
    },
    // Increase chunk size warning limit (we know about the large bundles)
    chunkSizeWarningLimit: 600,
    sourcemap: mode === "development", // Source maps only in dev
  },
  esbuild: {
    // Remove console.log in production
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
