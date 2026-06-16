import { lazy, Suspense, useEffect, useCallback } from "react";
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
import { useGlobalMatchRealtime } from "@/hooks/useGlobalMatchRealtime";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useIOSPermissions } from "@/hooks/useIOSPermissions";

// Lazy load deferred (non-critical) UI overlays — keeps them out of the initial bundle
const MatchAnimation = lazy(() =>
  import("@/components/MatchAnimation").then((m) => ({ default: m.MatchAnimation }))
);
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
const CoinsSuccess = lazy(() => import("./pages/CoinsSuccess"));
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
const Spotted = lazy(() => import("./pages/Spotted"));
const Events = lazy(() => import("./pages/Events"));
const SecondLook = lazy(() => import("./pages/SecondLook"));
const WeeklySpotlight = lazy(() => import("./pages/WeeklySpotlight"));
const DateSpotSuggestions = lazy(() => import("./pages/DateSpotSuggestions"));
const DoubleDatePlanner = lazy(() => import("./pages/DoubleDatePlanner"));
const EventsMap = lazy(() => import("./pages/EventsMap"));
const IcebreakerGames = lazy(() => import("./pages/IcebreakerGames"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Realtime-backed queries (matches, conversations) are invalidated
      // manually on INSERT events — so a long staleTime avoids redundant
      // network round-trips on every navigation.
      staleTime: 5 * 60_000, // 5 min: data stays fresh between page visits
      gcTime: 15 * 60_000, // 15 min: keep cache alive across tab switches
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // re-sync after going back online
      networkMode: "offlineFirst", // serve cache immediately, fetch in bg
    },
  },
});

const AppContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Request iOS permissions (notifications, location, camera, mic) once after login
  useIOSPermissions(user?.id);

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

  // Handle deep link callback from Apple/Google OAuth on Capacitor iOS.
  // When Apple/Google redirects to com.shqiponja.app://auth/callback#access_token=...
  // iOS opens the app via the URL scheme. We extract the tokens and set the session.
  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    CapApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.includes("auth/callback")) return;
      try {
        // Replace the custom scheme with https so URL can be parsed normally
        const normalized = url
          .replace("com.shqiponja.app://", "https://shqiponja.app/")
          .replace("com.shqiponja.app:", "https://shqiponja.app");
        const parsed = new URL(normalized);
        // Tokens may be in the hash (implicit) or query (PKCE)
        const params = new URLSearchParams(
          parsed.hash ? parsed.hash.replace("#", "") : parsed.search.replace("?", "")
        );
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          // Close the in-app browser (SFSafariViewController)
          await Browser.close();
        }
      } catch (err) {
        logger.error("Deep link OAuth error:", err);
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  const handleAcceptCall = (matchId: string, callType: "voice" | "video") => {
    logger.log("📞 Accepting call, navigating to chat:", { matchId, callType });
    navigate(`/chat/${matchId}?autoAnswer=${callType}`);
  };

  // Global match listener — fires from any page
  const { pendingMatch, dismissMatch } = useGlobalMatchRealtime();

  const handleGlobalChatNow = useCallback(
    (opener?: string) => {
      if (!pendingMatch) return;
      const matchId = pendingMatch.matchId;
      dismissMatch();
      navigate(`/chat/${matchId}`, opener ? { state: { opener } } : undefined);
    },
    [pendingMatch, dismissMatch, navigate]
  );

  usePageViewTracking();

  return (
    <>
      <ConnectionBanner />
      <Toaster />
      <Sonner />
      <div className="page-scroll">
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
              path="/coins-success"
              element={
                <ProtectedRoute>
                  <CoinsSuccess />
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
            <Route
              path="/spotted"
              element={
                <ProtectedRoute>
                  <Spotted />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/second-look"
              element={
                <ProtectedRoute>
                  <SecondLook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weekly-spotlight"
              element={
                <ProtectedRoute>
                  <WeeklySpotlight />
                </ProtectedRoute>
              }
            />
            <Route
              path="/date-spot-suggestions"
              element={
                <ProtectedRoute>
                  <DateSpotSuggestions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/double-date-planner"
              element={
                <ProtectedRoute>
                  <DoubleDatePlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events-map"
              element={
                <ProtectedRoute>
                  <EventsMap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/icebreaker-games"
              element={
                <ProtectedRoute>
                  <IcebreakerGames />
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
      </div>

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

      {/* Global match overlay — visible from any page, no navigation required */}
      {pendingMatch && (
        <Suspense fallback={null}>
          <MatchAnimation
            show={!!pendingMatch}
            matchName={pendingMatch.matchName}
            onComplete={dismissMatch}
            onChatNow={handleGlobalChatNow}
            sharedInterests={pendingMatch.sharedInterests}
          />
        </Suspense>
      )}
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
