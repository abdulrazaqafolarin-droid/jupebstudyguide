import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";

let chunkLoadRetry = false;
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e.reason?.message || '').toLowerCase();
  if ((msg.includes('dynamically imported') || msg.includes('failed to fetch')) && !chunkLoadRetry) {
    chunkLoadRetry = true;
    e.preventDefault();
    location.href = location.href.split('?')[0] + '?t=' + Date.now();
  }
});

(async () => {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      await reg.unregister();
    }
    if ('caches' in window) {
      for (const key of await caches.keys()) {
        if (key.startsWith('jupeb') || key.startsWith('workbox') || key.includes('precache')) {
          await caches.delete(key);
        }
      }
    }
  }
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <App />
  </ThemeProvider>
);
