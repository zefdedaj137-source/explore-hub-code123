import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      // clientPort: 443, // Uncomment when using ngrok HTTPS
    },
    allowedHosts: [
      ".ngrok-free.dev",
      ".ngrok.io",
      ".ngrok.app",
      "localhost",
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production optimizations
    minify: 'esbuild', // Use esbuild minification
    // Code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
          ],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['date-fns', 'clsx', 'class-variance-authority'],
        },
      },
    },
    // Increase chunk size warning limit (we know about the large bundles)
    chunkSizeWarningLimit: 600,
    sourcemap: mode === 'development', // Source maps only in dev
  },
  esbuild: {
    // Remove console.log in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
