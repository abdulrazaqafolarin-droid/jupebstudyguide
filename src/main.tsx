import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
