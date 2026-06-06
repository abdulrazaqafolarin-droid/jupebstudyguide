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

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <App />
  </ThemeProvider>
);
