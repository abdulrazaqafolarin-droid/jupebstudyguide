import { lazy, Suspense, useEffect } from "react";
import { initDataLayer } from "@/data/study-questions";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ChatUnreadProvider } from "@/contexts/ChatUnreadContext";
import { PushNotificationsProvider } from "@/contexts/PushNotificationsContext";
import { NativeNotificationBridge } from "@/components/NativeNotificationBridge";
import ProtectedRoute, { AdminRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "./components/InstallPrompt";
import SWUpdatePrompt from "./components/SWUpdatePrompt";
import AppUpdatePrompt from "./components/AppUpdatePrompt";
import { ProfilePhotoViewerProvider } from "@/components/ProfilePhotoViewer";
import { InAppNotificationBar } from "@/components/InAppNotificationBar";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { preloadHotRoutes } from "@/lib/route-preload";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const SettingsProfile = lazy(() => import("./pages/SettingsProfile"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FloatingAITutor = lazy(() =>
  import("./components/FloatingAITutor").then((m) => ({ default: m.FloatingAITutor }))
);
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const StudyStatsDashboard = lazy(() => import("./pages/StudyStatsDashboard"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const StudyPastQuestions = lazy(() => import("./pages/StudyPastQuestions"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));
const ActivationCodes = lazy(() => import("./pages/admin/ActivationCodes"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const SyllabusPage = lazy(() => import("./pages/SyllabusPage"));
const StudyChatPage = lazy(() => import("./pages/StudyChatPage"));


const queryClient = new QueryClient();

/**
 * Presence + Notifications providers intentionally live at the router root
 * (see App): mounting them per-route tore down and re-subscribed the realtime
 * presence channels and refetched notification state on every navigation.
 */
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <AppNotificationBar />
      <BottomNav />
      <div className="pb-16">
        {children}
      </div>
    </PageTransition>
  );
}

function ProtectedChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNotificationBar />
      {children}
    </>
  );
}

function AppNotificationBar() {
  const navigate = useNavigate();
  return (
    <InAppNotificationBar
      onOpenConversation={(convId) => {
        navigate(`/chat?conversation=${convId}`);
      }}
      onOpenFriendsTab={() => navigate('/friends')}
    />
  );
}

/**
 * Fresh pushes start at the top like a native screen. Back/forward (POP) is
 * deliberately left alone — the browser restores scroll positions itself for
 * history navigation, so resetting there would fight it.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType !== "POP") window.scrollTo(0, 0);
  }, [pathname, navigationType]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<ErrorBoundary><Auth /></ErrorBoundary>} />
        <Route path="/download" element={<ErrorBoundary><DownloadApp /></ErrorBoundary>} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <Index />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedChatLayout>
                  <Chat />
                </ProtectedChatLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <Profile />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/profile" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <SettingsProfile />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/security" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <SecuritySettings />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/friends" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <FriendsPage />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/past-questions" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <StudyPastQuestions />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/leaderboard" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <LeaderboardPage />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/achievements" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <AchievementsPage />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/stats" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <StudyStatsDashboard />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/discover" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <DiscoverPage />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/syllabus" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <SyllabusPage />
                </ProtectedLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/study-chat" 
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProtectedChatLayout>
                  <StudyChatPage />
                </ProtectedChatLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/codes" 
          element={
            <AdminRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <ActivationCodes />
                </ProtectedLayout>
              </ErrorBoundary>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <ErrorBoundary>
                <ProtectedLayout>
                  <AdminDashboard />
                </ProtectedLayout>
              </ErrorBoundary>
            </AdminRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      </AnimatePresence>
    </>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  // No exit animation, deliberately: AnimatePresence runs in wait mode, so a
  // fade-out would hold the previous page for its full duration before the
  // next one could mount — a guaranteed stall on every tap. Native screens
  // swap instantly; we only ease the incoming page in, short and subtle, so
  // navigation feels immediate.
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
};

const App = () => {
  useEffect(() => {
    initDataLayer();
    preloadHotRoutes();
  }, []);

  // next-themes drives the theme via a class on <html>, which a static meta
  // tag can't follow with media queries alone — keep the browser toolbar
  // painted in the active theme's background so the app reads as one surface.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const applyThemeColor = () => {
      const dark = document.documentElement.classList.contains("dark");
      meta.setAttribute("content", dark ? "#14171c" : "#f8f6f2");
    };
    applyThemeColor();
    const observer = new MutationObserver(applyThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
        <PushNotificationsProvider>
        <ChatUnreadProvider>
          <ProfilePhotoViewerProvider>
            <Toaster />
            <Sonner />
            <InstallPrompt />
            <SWUpdatePrompt />
            <AppUpdatePrompt />
            <BrowserRouter>
              {/* Router-root providers: presence channels and notification
                  state persist across route changes instead of churning on
                  every navigation (see ProtectedLayout note). */}
              <PresenceProvider>
                <NotificationsProvider>
                  <NativeNotificationBridge />
                  <AnimatedRoutes />
                  <ErrorBoundary>
                  <Suspense fallback={null}>
                    <FloatingAITutor />
                  </Suspense>
                  </ErrorBoundary>
                </NotificationsProvider>
              </PresenceProvider>
            </BrowserRouter>
          </ProfilePhotoViewerProvider>
        </ChatUnreadProvider>
        </PushNotificationsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
