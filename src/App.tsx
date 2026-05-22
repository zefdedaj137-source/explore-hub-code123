import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSkeleton";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

// Lazy load deferred (non-critical) UI overlays — keeps them out of the initial bundle
const IncomingCallDialog = lazy(() =>
  import("@/components/IncomingCallDialog").then((m) => ({ default: m.IncomingCallDialog }))
);
const AgeGate = lazy(() => import("@/components/AgeGate"));
const PushPrompt = lazy(() =>
  import("@/components/PushPrompt").then((m) => ({ default: m.PushPrompt }))
);

// Lazy loaded pages
// Lazy load pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Discover = lazy(() => import("./pages/Discover"));
const Matches = lazy(() => import("./pages/Matches"));
const Chat = lazy(() => import("./pages/Chat"));
// Forces a full remount when matchId changes — prevents stale state (date plans, messages, profile) bleeding between chats
const ChatWithKey = () => {
  const { matchId } = useParams();
  return <Chat key={matchId} />;
};
const MyProfile = lazy(() => import("./pages/MyProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const PremiumSuccess = lazy(() => import("./pages/PremiumSuccess"));
const SuperlikeSuccess = lazy(() => import("./pages/SuperlikeSuccess"));
const WhoLikedYou = lazy(() => import("./pages/WhoLikedYou"));
const Radar = lazy(() => import("./pages/Radar"));
const Games = lazy(() => import("./pages/Games"));
const GameDiscover = lazy(() => import("./pages/GameDiscover"));
const GameLobby = lazy(() => import("./pages/GameLobby"));
const GameSession = lazy(() => import("./pages/GameSession"));
const GameSessionMusic = lazy(() => import("./pages/GameSessionMusic"));
const GameSessionDance = lazy(() => import("./pages/GameSessionDance"));
const SafetyCenter = lazy(() => import("./pages/SafetyCenter"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotificationsCenter = lazy(() => import("./pages/NotificationsCenter"));
const Wallet = lazy(() => import("./pages/Wallet"));
const CallHistory = lazy(() => import("./pages/CallHistory"));
const SavedProfiles = lazy(() => import("./pages/SavedProfiles"));
const RecentlyViewed = lazy(() => import("./pages/RecentlyViewed"));
const BlockedUsers = lazy(() => import("./pages/BlockedUsers"));
const ProfileInsights = lazy(() => import("./pages/ProfileInsights"));
const InviteFriends = lazy(() => import("./pages/InviteFriends"));
const DailyRewards = lazy(() => import("./pages/DailyRewards"));
const SafetyTips = lazy(() => import("./pages/SafetyTips"));
const ProfileVerification = lazy(() => import("./pages/ProfileVerification"));
const DatePlanner = lazy(() => import("./pages/DatePlanner"));
const BoostBundles = lazy(() => import("./pages/BoostBundles"));
const ActivityFeed = lazy(() => import("./pages/ActivityFeed"));

const MatchInsights = lazy(() => import("./pages/MatchInsights"));
const VideoIntro = lazy(() => import("./pages/VideoIntro"));
const SafetyCheckIn = lazy(() => import("./pages/SafetyCheckIn"));
const Stories = lazy(() => import("./pages/Stories"));
const MatchGoals = lazy(() => import("./pages/MatchGoals"));
const MoodStatus = lazy(() => import("./pages/MoodStatus"));
const MusicTaste = lazy(() => import("./pages/MusicTaste"));
const PhotoVerificationSelfie = lazy(() => import("./pages/PhotoVerificationSelfie"));
const GhostModeAlert = lazy(() => import("./pages/GhostModeAlert"));
const ProfileSoundtrack = lazy(() => import("./pages/ProfileSoundtrack"));
const AdminSafety = lazy(() => import("./pages/AdminSafety"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const Features = lazy(() => import("./pages/Features"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AIMatchmaker = lazy(() => import("./pages/AIMatchmaker"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // treat data fresh for 1 minute — avoids refetch on every navigation
      gcTime: 5 * 60_000, // keep unused data in cache for 5 minutes
      retry: 1, // only retry once on network errors
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle password recovery redirect — Supabase may send users to "/"
  // with the recovery hash instead of "/reset-password"
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true, state: { fromRecovery: true } });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Heartbeat: update last_active every 2 minutes
  useEffect(() => {
    if (!user) return;
    const update = () =>
      supabase.from("profiles").update({ last_active: new Date().toISOString() }).eq("id", user.id);
    update(); // immediate
    const interval = setInterval(update, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAcceptCall = (matchId: string, callType: "voice" | "video") => {
    logger.log("📞 Accepting call, navigating to chat:", { matchId, callType });
    // Navigate to chat page which will handle the call
    navigate(`/chat/${matchId}?autoAnswer=${callType}`);
  };

  usePageViewTracking();

  return (
    <>
      <ConnectionBanner />
      <Toaster />
      <Sonner />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Protected routes */}
          <Route
            path="/profile-setup"
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:matchId"
            element={
              <ProtectedRoute>
                <ChatWithKey />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-profile"
            element={
              <ProtectedRoute>
                <MyProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/premium-success"
            element={
              <ProtectedRoute>
                <PremiumSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superlike-success"
            element={
              <ProtectedRoute>
                <SuperlikeSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/who-liked-you"
            element={
              <ProtectedRoute>
                <WhoLikedYou />
              </ProtectedRoute>
            }
          />
          <Route
            path="/radar"
            element={
              <ProtectedRoute>
                <Radar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <Games />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-discover"
            element={
              <ProtectedRoute>
                <GameDiscover />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-lobby"
            element={
              <ProtectedRoute>
                <GameLobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-session/:sessionId"
            element={
              <ProtectedRoute>
                <GameSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-session-music/:sessionId"
            element={
              <ProtectedRoute>
                <GameSessionMusic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-session-dance/:sessionId"
            element={
              <ProtectedRoute>
                <GameSessionDance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safety"
            element={
              <ProtectedRoute>
                <SafetyCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/call-history"
            element={
              <ProtectedRoute>
                <CallHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedProfiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recently-viewed"
            element={
              <ProtectedRoute>
                <RecentlyViewed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blocked"
            element={
              <ProtectedRoute>
                <BlockedUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <ProfileInsights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invite"
            element={
              <ProtectedRoute>
                <InviteFriends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <DailyRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safety-tips"
            element={
              <ProtectedRoute>
                <SafetyTips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verification"
            element={
              <ProtectedRoute>
                <ProfileVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/date-planner"
            element={
              <ProtectedRoute>
                <DatePlanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boost-bundles"
            element={
              <ProtectedRoute>
                <BoostBundles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <ActivityFeed />
              </ProtectedRoute>
            }
          />

          <Route
            path="/match-insights"
            element={
              <ProtectedRoute>
                <MatchInsights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-intro"
            element={
              <ProtectedRoute>
                <VideoIntro />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safety-checkin"
            element={
              <ProtectedRoute>
                <SafetyCheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories"
            element={
              <ProtectedRoute>
                <Stories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/match-goals"
            element={
              <ProtectedRoute>
                <MatchGoals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mood-status"
            element={
              <ProtectedRoute>
                <MoodStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/music-taste"
            element={
              <ProtectedRoute>
                <MusicTaste />
              </ProtectedRoute>
            }
          />
          <Route
            path="/photo-verification"
            element={
              <ProtectedRoute>
                <PhotoVerificationSelfie />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ghost-alerts"
            element={
              <ProtectedRoute>
                <GhostModeAlert />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile-soundtrack"
            element={
              <ProtectedRoute>
                <ProfileSoundtrack />
              </ProtectedRoute>
            }
          />
          <Route
            path="/features"
            element={
              <ProtectedRoute>
                <Features />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-matchmaker"
            element={
              <ProtectedRoute>
                <AIMatchmaker />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/safety"
            element={
              <ProtectedRoute adminOnly>
                <AdminSafety />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute adminOnly>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {/* Global incoming call listener — lazy, only for authenticated users */}
      {user && (
        <Suspense fallback={null}>
          <IncomingCallDialog onAccept={handleAcceptCall} />
        </Suspense>
      )}

      {/* Push notification opt-in prompt */}
      <Suspense fallback={null}>
        <PushPrompt />
      </Suspense>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
            <AgeGate />
          </Suspense>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
