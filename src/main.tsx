import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Android insets are consumed by the native content container before render.
// Mark the platform up front so CSS cannot apply a second top safe-area offset.
if (Capacitor.getPlatform() === "android") {
  document.documentElement.classList.add("native-android");
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.textContent = "Rutex Master(Jupeb) could not find its application root. Please reload the app.";
} else {
  createRoot(rootElement).render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>,
  );
}
