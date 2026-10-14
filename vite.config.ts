import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

let devTaggerPlugin: typeof import("lovable-tagger").componentTagger | undefined;
try {
  devTaggerPlugin = (await import("lovable-tagger")).componentTagger;
} catch {
  /* lovable-tagger not installed */
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    ...(mode === "development" && devTaggerPlugin ? [devTaggerPlugin()] : []),
    VitePWA({
      registerType: "autoUpdate",
      // injectManifest: custom SW (precache + push notifications) in src/sw.ts.
      // generateSW would clobber the hand-written push handler.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.ico", "favicon.svg", "robots.txt"],
      manifest: {
        name: "JUPEB Master - Past Questions Study App",
        short_name: "JUPEB Master",
        description: "Master JUPEB exams with spaced repetition and AI tutoring. Study Physics, Chemistry & Biology past questions.",
        theme_color: "#D4A34C",
        background_color: "#0D0D0D",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\.groq\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/scheduler")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/katex")) {
            return "vendor-katex";
          }
          if (id.includes("node_modules/pdfjs-dist") || id.includes("node_modules/pdf-lib") || id.includes("node_modules/canvas")) {
            return "vendor-pdf";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("src/lib/")) {
            return "shared-lib";
          }
          if (id.includes("src/contexts/")) {
            return "shared-context";
          }
          if (id.includes("src/components/ui/")) {
            return "shared-ui";
          }
          if (id.includes("src/integrations/")) {
            return "shared-integrations";
          }
          if (id.includes("src/data/study-questions")) {
            return "study-data";
          }
          if (id.includes("node_modules")) {
            return "vendor-other";
          }
        },
      },
    },
  },
}));
