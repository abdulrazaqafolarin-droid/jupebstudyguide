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
      // Registration/update consent is managed by index.html + SWUpdatePrompt.
      // injectManifest: custom SW (precache + push notifications) in src/sw.ts.
      // generateSW would clobber the hand-written push handler.
      // index.html registers the worker; SWUpdatePrompt owns update consent.
      registerType: "prompt",
      injectRegister: false,
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
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
          const moduleId = id.split(String.fromCharCode(92)).join("/");
          // Keep framework/runtime boundaries stable, but let optional
          // feature packages follow their importing lazy route. Group only
          // the app's own shared layers to keep the entry point small without
          // creating vendor-other ↔ radix/charts circular chunks.
          if (moduleId.includes("/node_modules/react-dom/") || moduleId.includes("/node_modules/react/") || moduleId.includes("/node_modules/scheduler/")) {
            return "vendor-react";
          }
          if (moduleId.includes("/node_modules/@supabase/")) return "vendor-supabase";
          if (moduleId.includes("/node_modules/katex/")) return "vendor-katex";
          if (moduleId.includes("/node_modules/framer-motion/")) return "vendor-framer";
          if (moduleId.includes("/node_modules/canvas-confetti/")) return "vendor-effects";
          if (moduleId.includes("/src/contexts/")) return "shared-context";
          if (moduleId.includes("/src/components/ui/")) return "shared-ui";
          if (moduleId.includes("/src/integrations/")) return "shared-integrations";
          if (moduleId.includes("/src/data/study-questions/")) return "study-data";
          if (moduleId.includes("/src/lib/")) return "shared-lib";
        }
      },
    },
  },
}));
