import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "./components/ErrorBoundary";

let chunkLoadRetry = false;
window.addEventListener("unhandledrejection", (event) => {
  const message = (event.reason?.message || "").toLowerCase();
  if (
    (message.includes("dynamically imported") || message.includes("failed to fetch")) &&
    !chunkLoadRetry
  ) {
    chunkLoadRetry = true;
    event.preventDefault();
    location.href = location.href.split("?")[0] + "?t=" + Date.now();
  }
});

function AppMountedSignal() {
  useEffect(() => {
    window.dispatchEvent(new Event("jupeb:app-ready"));
  }, []);
  return null;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.textContent = "Rutex Master(Jupeb) could not find its application root. Please reload the app.";
} else {
  createRoot(rootElement).render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <AppMountedSignal />
      </>
    </ThemeProvider>,
  );
}
