import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

(async () => {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
