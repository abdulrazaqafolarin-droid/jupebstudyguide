import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ChatUnreadProvider } from "@/contexts/ChatUnreadContext";
import { PushNotificationsProvider } from "@/contexts/PushNotificationsContext";
import ProtectedRoute, { AdminRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "./components/InstallPrompt";
import { FloatingAITutor } from "./components/FloatingAITutor";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { ProfilePhotoViewerProvider } from "@/components/ProfilePhotoViewer";
import { InAppNotificationBar } from "@/components/InAppNotificationBar";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const SettingsProfile = lazy(() => import("./pages/SettingsProfile"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const StudyPastQuestions = lazy(() => import("./pages/StudyPastQuestions"));
const DownloadApp = lazy(() => import("./pages/DownloadApp"));
const ActivationCodes = lazy(() => import("./pages/admin/ActivationCodes"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));


const queryClient = new QueryClient();

function ChatNotificationListener() {
  useChatNotifications();
  return null;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <NotificationsProvider>
        <ChatNotificationListener />
        <AppNotificationBar />
        <BottomNav />
        <div className="pb-16">
          {children}
        </div>
      </NotificationsProvider>
    </PageTransition>
  );
}

function ProtectedChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <ChatNotificationListener />
      <AppNotificationBar />
      {children}
    </NotificationsProvider>
  );
}

function AppNotificationBar() {
  const navigate = useNavigate();
  return (
    <InAppNotificationBar
      onOpenConversation={(convId) => {
        navigate(`/chat?conversation=${convId}`);
      }}
      onOpenFriendsTab={() => navigate('/chat?tab=friends')}
    />
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
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
                <ProtectedChatLayout>
                  <SettingsProfile />
                </ProtectedChatLayout>
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
  );
}

function AppNotificationBar() {
  const navigate = useNavigate();
  return (
    <InAppNotificationBar
      onOpenConversation={(convId) => {
        navigate(`/chat?conversation=${convId}`);
        window.location.href = `/chat?conversation=${convId}`;
      }}
      onOpenFriendsTab={() => navigate('/chat?tab=friends')}
    />
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

function WrappedPage({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
      <PushNotificationsProvider>
      <ChatUnreadProvider>
        <ProfilePhotoViewerProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <BrowserRouter>
            <AnimatedRoutes />
            <ErrorBoundary>
            <FloatingAITutor />
            </ErrorBoundary>
          </BrowserRouter>
        </ProfilePhotoViewerProvider>
      </ChatUnreadProvider>
      </PushNotificationsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
