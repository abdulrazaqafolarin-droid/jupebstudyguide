/**
 * Preload only the two most-used secondary routes, and do it slowly after the
 * first screen has painted. Do not compete with the initial Supabase session,
 * home data, or user interaction on metered/slow mobile connections.
 */
const hotRouteModules = [
  () => import("@/pages/Chat"),
  () => import("@/pages/StudyPastQuestions"),
];

export function preloadHotRoutes(): void {
  if (typeof window === "undefined") return;

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;

  if (connection?.saveData) return;
  if (connection?.effectiveType && ["slow-2g", "2g"].includes(connection.effectiveType)) return;

  const warm = async () => {
    for (const load of hotRouteModules) {
      if (document.visibilityState !== "visible") return;
      try {
        await load();
      } catch {
        // A failed warm-up is harmless; navigation retries the route import.
      }
    }
  };

  const schedule = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => void warm(), { timeout: 5000 });
    } else {
      window.setTimeout(() => void warm(), 3500);
    }
  };

  // Do not prefetch while the app is still starting.
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}
