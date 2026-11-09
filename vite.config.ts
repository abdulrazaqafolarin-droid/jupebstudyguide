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

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    ...(mode === "development" && devTaggerPlugin ? [devTaggerPlugin()] : []),
    VitePWA({
      injectRegister: false,
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.ico", "favicon.svg", "robots.txt"],
      includeManifestIcons: false,
      injectManifest: {
        globPatterns: [
          "index.html",
          "manifest.webmanifest",
          "**/*.css",
          "pwa-*.png",
        ],
      },
      manifest: {
        name: "Rutex Master(Jupeb) - Past Questions Study App",
        short_name: "Rutex Master(Jupeb)",
        description: "Master JUPEB exams with spaced repetition and AI tutoring. Study Physics, Chemistry & Biology past questions.",
        theme_color: "#D4A34C",
        background_color: "#0D0D0D",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep only third-party chunks fixed. Forcing app contexts, integration
        // clients and lib modules into separate chunks created a reported ESM
        // cycle (shared-integrations <-> shared-lib). Let Rollup split app code
        // according to its actual import graph to avoid fragile chunk cycles.
        manualChunks(id) {
          const moduleId = id.split(String.fromCharCode(92)).join("/");
          if (
            moduleId.includes("/node_modules/react-dom/") ||
            moduleId.includes("/node_modules/react/") ||
            moduleId.includes("/node_modules/scheduler/")
          ) return "vendor-react";
          if (moduleId.includes("/node_modules/@supabase/")) return "vendor-supabase";
          if (moduleId.includes("/node_modules/katex/")) return "vendor-katex";
          if (moduleId.includes("/node_modules/framer-motion/")) return "vendor-framer";
          if (moduleId.includes("/node_modules/canvas-confetti/")) return "vendor-effects";
        },
      },
    },
  },
}));
