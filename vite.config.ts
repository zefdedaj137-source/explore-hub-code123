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
    // Production optimizations — target modern JS for better tree-shaking & smaller output
    target: "esnext",
    minify: "esbuild",
    // Split CSS per-chunk so only the styles for loaded routes are fetched
    cssCodeSplit: true,
    // Inline assets under 4 KB as base64 (saves round-trips for tiny images/icons)
    assetsInlineLimit: 4096,
    // Code splitting for better caching granularity
    rollupOptions: {
      output: {
        // Use content-hash filenames for aggressive long-term caching
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: {
          // NOTE: react, react-dom, react-router-dom, radix-ui, react-i18next, i18next
          // are intentionally NOT manually chunked — their interdependencies create
          // circular chunk references that cause React.createContext to be undefined
          // on full-page reloads (e.g. OAuth redirects). Rollup auto-chunks them safely.
          icons: ["lucide-react"],
          motion: ["framer-motion"],
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query"],
          utils: ["date-fns", "clsx", "class-variance-authority", "tailwind-merge"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          charts: ["recharts"],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 700,
    sourcemap: mode === "development",
    // Improve build reporting
    reportCompressedSize: mode === "production",
  },
  esbuild: {
    // Remove console.log and debugger in production
    drop: mode === "production" ? ["console", "debugger"] : [],
    // Pure function annotations for better tree-shaking
    pure: mode === "production" ? ["console.log", "console.info", "console.debug"] : [],
  },
  // Improve CSS processing
  css: {
    devSourcemap: mode === "development",
  },
}));
