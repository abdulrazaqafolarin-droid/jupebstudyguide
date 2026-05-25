import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import ProtectedRoute, { AdminRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import SettingsProfile from "./pages/SettingsProfile";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/InstallPrompt";
import { FloatingAITutor } from "./components/FloatingAITutor";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import StudyPastQuestions from "./pages/StudyPastQuestions";
import DownloadApp from "./pages/DownloadApp";
import ActivationCodes from "./pages/admin/ActivationCodes";
import AdminDashboard from "./pages/admin/AdminDashboard";

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
      {children}
    </NotificationsProvider>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <ErrorBoundary>
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/download" element={<DownloadApp />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Index />
              </ProtectedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ProtectedChatLayout>
                <Chat />
              </ProtectedChatLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Profile />
              </ProtectedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/profile" 
          element={
            <ProtectedRoute>
              <ProtectedChatLayout>
                <SettingsProfile />
              </ProtectedChatLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/past-questions" 
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <StudyPastQuestions />
              </ProtectedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/leaderboard" 
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <LeaderboardPage />
              </ProtectedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/codes" 
          element={
            <AdminRoute>
              <ProtectedLayout>
                <ActivationCodes />
              </ProtectedLayout>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <ProtectedLayout>
                <AdminDashboard />
              </ProtectedLayout>
            </AdminRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
    </AnimatePresence>
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <AnimatedRoutes />
          <FloatingAITutor />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
