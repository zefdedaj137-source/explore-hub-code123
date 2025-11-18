import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSkeleton";
import { IncomingCallDialog } from "@/components/IncomingCallDialog";

// Lazy loaded pages
// Lazy load pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Discover = lazy(() => import("./pages/Discover"));
const Matches = lazy(() => import("./pages/Matches"));
const Chat = lazy(() => import("./pages/Chat"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const PremiumSuccess = lazy(() => import("./pages/PremiumSuccess"));
const WhoLikedYou = lazy(() => import("./pages/WhoLikedYou"));
const Radar = lazy(() => import("./pages/Radar"));
const Games = lazy(() => import("./pages/Games"));
const GameDiscover = lazy(() => import("./pages/GameDiscover"));
const GameLobby = lazy(() => import("./pages/GameLobby"));
const GameSession = lazy(() => import("./pages/GameSession"));
const GameSessionMusic = lazy(() => import("./pages/GameSessionMusic"));
const GameSessionDance = lazy(() => import("./pages/GameSessionDance"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppContent = () => {
  const navigate = useNavigate();

  const handleAcceptCall = (matchId: string, callType: "voice" | "video") => {
    console.log('📞 Accepting call, navigating to chat:', { matchId, callType });
    // Navigate to chat page which will handle the call
    navigate(`/chat/${matchId}?autoAnswer=${callType}`);
  };

  return (
    <>
      <Toaster />
      <Sonner />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/chat/:matchId" element={<Chat />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/premium-success" element={<PremiumSuccess />} />
          <Route path="/who-liked-you" element={<WhoLikedYou />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/games" element={<Games />} />
          <Route path="/game-discover" element={<GameDiscover />} />
          <Route path="/game-lobby" element={<GameLobby />} />
          <Route path="/game-session/:sessionId" element={<GameSession />} />
          <Route path="/game-session-music/:sessionId" element={<GameSessionMusic />} />
          <Route path="/game-session-dance/:sessionId" element={<GameSessionDance />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      {/* Global incoming call listener - works on all pages */}
      <IncomingCallDialog onAccept={handleAcceptCall} />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
