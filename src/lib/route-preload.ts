/**
 * Warm the code-split chunks behind the bottom bar and side menu while the
 * app is idle.
 *
 * Every route is lazily imported, so the first visit to a page otherwise
 * trips React.Suspense and flashes the full-screen PageLoader (BottomNav and
 * all) while the chunk loads. Importing the same pages here shares Vite's
 * module cache with the router's `lazy(() => import(...))` calls, so by the
 * time a user taps the nav the module is already resolved and the route
 * renders synchronously — no spinner, no perceived wait.
 *
 * Only the hot paths are warmed (bottom bar + study/chat entry points); the
 * long tail of the menu still lazy-loads on first visit.
 */
const hotRouteModules = [
  () => import("@/pages/Chat"),
  () => import("@/pages/StudyChatPage"),
  () => import("@/pages/StudyPastQuestions"),
  () => import("@/pages/SyllabusPage"),
  () => import("@/pages/LeaderboardPage"),
  () => import("@/pages/Profile"),
  () => import("@/pages/FriendsPage"),
];

export function preloadHotRoutes(): void {
  const warm = () => {
    for (const load of hotRouteModules) {
      void load().catch(() => {
        /* best-effort: a failed prefetch just loads on demand later */
      });
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warm, { timeout: 4000 });
  } else {
    window.setTimeout(warm, 2500);
  }
}
