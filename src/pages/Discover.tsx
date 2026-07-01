import { useState, useEffect, useLayoutEffect, useCallback, useMemo, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/sanitize";
import { OptimizedImage } from "@/components/OptimizedImage";
import { analytics } from "@/lib/analytics";
import { enqueue } from "@/lib/offlineQueue";
import { useAuth } from "@/contexts/AuthContext";
import { recordProfileView } from "@/lib/profileTracking";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Heart,
  X,
  MapPin,
  LogOut,
  MessageCircle,
  Settings,
  Crown,
  Filter,
  Home,
  Users,
  Menu,
  Navigation,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gamepad2,
  Zap,
  MessageSquare,
  Flower2,
  Bell,
  Eye,
  RotateCcw,
  User,
  Briefcase,
  GraduationCap,
  Ruler,
  Church,
  SlidersHorizontal,
  MoreVertical,
  Coins,
  Bookmark,
  Smile,
  Ghost,
  Star,
  Undo2,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReportUserDialog from "@/components/ReportUserDialog";
import { TravelMode } from "@/components/TravelMode";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { usePurchases } from "@/hooks/usePurchases";
import { PRODUCT_IDS } from "@/lib/iap-products";
import { translateInterest } from "@/utils/translateInterest";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { MatchAnimation } from "@/components/MatchAnimation";
import { markMatchHandled } from "@/hooks/useGlobalMatchRealtime";
import { ProfileCardSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";
import type { Profile, StoryItem } from "@/types/profile";
import {
  extractYouTubeId,
  extractSpotifyTrackId,
  formatTimeAgo,
  computeMatchScore,
  isOnline,
} from "@/utils/discover-utils";
import { ProfileGridCard } from "@/components/discover/ProfileGridCard";

const Discover = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [spotlightProfiles, setSpotlightProfiles] = useState<Profile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [passedProfiles, setPassedProfiles] = useState<Set<string>>(new Set());
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [matchedMatchId, setMatchedMatchId] = useState<string | null>(null);
  const [isPremiumRosesMatch, setIsPremiumRosesMatch] = useState(false);
  const [swipeLimit, setSwipeLimit] = useState({
    remainingSwipes: 15,
    minutesUntilReset: 0,
    isPremium: false,
  });
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSuperlikeDialog, setShowSuperlikeDialog] = useState(false);
  const [superlikeCheckoutLoading, setSuperlikeCheckoutLoading] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileViews, setProfileViews] = useState<Profile[]>([]);
  const [profileLikes, setProfileLikes] = useState<Profile[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationTab, setNotificationTab] = useState<"views" | "likes">("views");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [cardImageIndex, setCardImageIndex] = useState(0); // photo index on main swipe card
  // Load last seen count from localStorage on mount (user-specific)
  const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState(() => {
    if (!user) return 0;
    const saved = localStorage.getItem(`lastSeenNotificationCount_${user.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [superlikesRemaining, setSuperlikesRemaining] = useState(0);
  const [isSuperliking, setIsSuperliking] = useState(false);
  const [boosterActive, setBoosterActive] = useState(false);
  const [boosterExpiresAt, setBoosterExpiresAt] = useState<string | null>(null);
  const [boosterTimeRemaining, setBoosterTimeRemaining] = useState<string>("");
  const [boostCredits, setBoostCredits] = useState(0);
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [showBoostStatusDialog, setShowBoostStatusDialog] = useState(false);
  const [instantMessageCredits, setInstantMessageCredits] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [travelModeActive, setTravelModeActive] = useState(false);
  const [travelLatitude, setTravelLatitude] = useState<number | null>(null);
  const [travelLongitude, setTravelLongitude] = useState<number | null>(null);
  const [travelCity, setTravelCity] = useState<string | null>(null);

  // Swipe gesture state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeAxis, setSwipeAxis] = useState<"x" | "y" | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeExiting, setSwipeExiting] = useState<"left" | "right" | "up" | "down" | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try {
      return !localStorage.getItem("discover_hint_shown");
    } catch {
      return false;
    }
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const likeOverlayRef = useRef<HTMLDivElement>(null);
  const nopeOverlayRef = useRef<HTMLDivElement>(null);
  const lastLikeTime = useRef(0);
  const lastSuperlikeTime = useRef(0);
  const swipeResetPushScheduled = useRef(false);
  // Refs to always call the latest handleLike/handlePass from handleSwipeEnd (avoids stale closure)
  const handleLikeRef = useRef<((profileId: string) => Promise<void>) | null>(null);
  const handlePassRef = useRef<((profileId: string) => Promise<void>) | null>(null);

  const SWIPE_THRESHOLD = 72;
  const SWIPE_THRESHOLD_Y = 90;

  const handleSwipeStart = useCallback((clientX: number, clientY: number) => {
    setSwipeStartX(clientX);
    setSwipeStartY(clientY);
    setSwipeAxis(null);
    setIsSwiping(true);
  }, []);

  const handleSwipeMove = useCallback(
    (clientX: number, clientY: number) => {
      if (swipeStartX === null || swipeStartY === null) return;
      const dx = clientX - swipeStartX;
      const dy = clientY - swipeStartY;
      // Lock axis after 8px movement to prevent diagonal jitter
      if (swipeAxis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        setSwipeAxis(Math.abs(dx) >= Math.abs(dy) ? "x" : "y");
      }
      if (swipeAxis === "x" || (swipeAxis === null && Math.abs(dx) > Math.abs(dy))) {
        setSwipeOffset(dx);
      } else {
        setSwipeOffsetY(dy);
      }
    },
    [swipeStartX, swipeStartY, swipeAxis]
  );

  const handleSwipeEnd = useCallback(() => {
    if (!isSwiping) return;
    const currentProfile = profiles[currentProfileIndex];
    if (swipeAxis === "y" && Math.abs(swipeOffsetY) > SWIPE_THRESHOLD_Y && currentProfile) {
      const direction = swipeOffsetY < 0 ? "up" : "down"; // up = like, down = pass
      setSwipeExiting(direction);
      setTimeout(() => {
        if (direction === "up") {
          handleLikeRef.current?.(currentProfile.id);
        } else {
          handlePassRef.current?.(currentProfile.id);
        }
        setSwipeExiting(null);
        setSwipeOffset(0);
        setSwipeOffsetY(0);
        setSwipeStartX(null);
        setSwipeStartY(null);
        setSwipeAxis(null);
        setIsSwiping(false);
      }, 300);
    } else if (swipeAxis !== "y" && Math.abs(swipeOffset) > SWIPE_THRESHOLD && currentProfile) {
      const direction = swipeOffset > 0 ? "right" : "left";
      setSwipeExiting(direction);
      setTimeout(() => {
        if (direction === "right") {
          handleLikeRef.current?.(currentProfile.id);
        } else {
          handlePassRef.current?.(currentProfile.id);
        }
        setSwipeExiting(null);
        setSwipeOffset(0);
        setSwipeOffsetY(0);
        setSwipeStartX(null);
        setSwipeStartY(null);
        setSwipeAxis(null);
        setIsSwiping(false);
      }, 300);
    } else {
      setSwipeOffset(0);
      setSwipeOffsetY(0);
      setSwipeStartX(null);
      setSwipeStartY(null);
      setSwipeAxis(null);
      setIsSwiping(false);
    }
  }, [isSwiping, swipeOffset, swipeOffsetY, swipeAxis, profiles, currentProfileIndex]);

  const swipeRotation = swipeExiting
    ? swipeExiting === "right"
      ? 15
      : swipeExiting === "left"
        ? -15
        : 0
    : Math.min(Math.max(swipeOffset * 0.08, -15), 15);
  const swipeTranslateX =
    swipeExiting === "right" ? 500 : swipeExiting === "left" ? -500 : swipeOffset;
  const swipeTranslateY =
    swipeExiting === "up" ? -700 : swipeExiting === "down" ? 700 : swipeOffsetY;
  const swipeOpacity = swipeExiting ? 0 : 1;
  const likeOpacity =
    swipeAxis === "y"
      ? Math.min(Math.max(-swipeOffsetY / SWIPE_THRESHOLD_Y, 0), 1)
      : Math.min(Math.max(swipeOffset / SWIPE_THRESHOLD, 0), 1);
  const nopeOpacity =
    swipeAxis === "y"
      ? Math.min(Math.max(swipeOffsetY / SWIPE_THRESHOLD_Y, 0), 1)
      : Math.min(Math.max(-swipeOffset / SWIPE_THRESHOLD, 0), 1);

  useEffect(() => {
    if (!showSwipeHint) return;
    const hintTimer = setTimeout(() => {
      setShowSwipeHint(false);
      try {
        localStorage.setItem("discover_hint_shown", "1");
      } catch {
        /* */
      }
    }, 4000);
    return () => clearTimeout(hintTimer);
  }, [showSwipeHint]);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${swipeTranslateX}px) translateY(${swipeTranslateY}px) rotate(${swipeRotation}deg)`;
      cardRef.current.style.opacity = String(swipeOpacity);
      cardRef.current.style.transition =
        isSwiping && !swipeExiting ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out";
    }
    if (likeOverlayRef.current) {
      likeOverlayRef.current.style.opacity = String(likeOpacity);
    }
    if (nopeOverlayRef.current) {
      nopeOverlayRef.current.style.opacity = String(nopeOpacity);
    }
  }, [
    swipeTranslateX,
    swipeTranslateY,
    swipeRotation,
    swipeOpacity,
    isSwiping,
    swipeExiting,
    likeOpacity,
    nopeOpacity,
  ]);

  const cacheKey = user
    ? `discover_profiles_cache_${user.id}_${travelModeActive ? "travel" : "home"}`
    : null;

  const dailyPicks = useMemo(() => {
    if (!profiles.length) return [] as Profile[];
    const seed = new Date().toISOString().slice(0, 10);
    const hash = (input: string) => {
      let h = 0;
      for (let i = 0; i < input.length; i += 1) {
        h = (h << 5) - h + input.charCodeAt(i);
        h |= 0;
      }
      return Math.abs(h);
    };

    return profiles
      .map((p) => ({ p, score: hash(`${p.id}-${seed}`) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map((item) => item.p);
  }, [profiles]);

  const savedKey = user ? `saved_profiles_${user.id}` : null;

  const loadSavedProfiles = useCallback(() => {
    if (!savedKey) return;
    const raw = localStorage.getItem(savedKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setSavedProfiles(new Set(parsed));
    } catch {
      // ignore parsing errors
    }
  }, [savedKey]);

  const toggleSaveProfile = (profileId: string) => {
    if (!savedKey) return;
    setSavedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      localStorage.setItem(savedKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const hasLoadedCacheRef = useRef(false);
  const prevCacheKeyRef = useRef<string | null>(null);
  useEffect(() => {
    // Clear cache when user changes (privacy: prevent cross-user cache leaks)
    if (cacheKey !== prevCacheKeyRef.current) {
      prevCacheKeyRef.current = cacheKey;
      hasLoadedCacheRef.current = false;
    }
    // Skip loading cache on very first mount - initializeData will fetch fresh data
    // This prevents stale home-location profiles from showing when travel mode is active
    if (!cacheKey || !hasLoadedCacheRef.current) {
      hasLoadedCacheRef.current = true;
      return;
    }
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Profile[];
        if (parsed.length) {
          setProfiles(parsed);
          setCurrentProfileIndex(0);
        }
      } catch (error) {
        logger.warn("Failed to parse cached profiles", error);
      }
    }
  }, [cacheKey]);

  const cacheProfiles = useCallback(
    (items: Profile[]) => {
      if (!cacheKey) return;
      localStorage.setItem(cacheKey, JSON.stringify(items.slice(0, 100)));
    },
    [cacheKey]
  );

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) {
      await supabase.from("wallets").insert({ user_id: user.id, balance: 0 });
      setWalletBalance(0);
    } else {
      setWalletBalance(data.balance || 0);
    }
  }, [user]);
  const [showInstantMessageDialog, setShowInstantMessageDialog] = useState(false);
  const [instantMessageText, setInstantMessageText] = useState("");
  const [instantMessageTargetProfile, setInstantMessageTargetProfile] = useState<Profile | null>(
    null
  );
  const [showPremiumRosesDialog, setShowPremiumRosesDialog] = useState(false);
  const [rosesTargetProfile, setRosesTargetProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"for-you" | "last-active">("for-you");
  const [rewindsRemaining, setRewindsRemaining] = useState(3);
  const [lastActionHistory, setLastActionHistory] = useState<
    Array<{ type: "like" | "pass"; profileId: string; timestamp: number }>
  >([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showFilterDiscardConfirm, setShowFilterDiscardConfirm] = useState(false);
  const [showNotificationProfileDialog, setShowNotificationProfileDialog] = useState(false);
  const [notificationProfile, setNotificationProfile] = useState<Profile | null>(null);
  const [notificationProfileImageIndex, setNotificationProfileImageIndex] = useState(0);
  const [showNotificationFullProfile, setShowNotificationFullProfile] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [profileStories, setProfileStories] = useState<StoryItem[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showDailyPicks, setShowDailyPicks] = useState(false);
  const [showLastActiveProfile, setShowLastActiveProfile] = useState(false);
  const [lastActiveProfile, setLastActiveProfile] = useState<Profile | null>(null);
  const [lastActiveImageIndex, setLastActiveImageIndex] = useState(0);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [tempFilters, setTempFilters] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 100,
    gender: "everyone",
    smartSort: true,
    // Premium filters
    verifiedOnly: false,
    hasProfileImage: true,
    specificInterests: [] as string[],
    minHeight: 0,
    maxHeight: 250,
    education: "any",
    smoking: "any",
    drinking: "any",
    religion: "any",
    lookingFor: "any",
    zodiacSign: "any",
  });
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 100,
    gender: "everyone",
    smartSort: true,
    // Premium filters
    verifiedOnly: false,
    hasProfileImage: true,
    specificInterests: [] as string[],
    minHeight: 0,
    maxHeight: 250,
    education: "any",
    smoking: "any",
    drinking: "any",
    religion: "any",
    lookingFor: "any",
    zodiacSign: "any",
  });

  // Fetch current user's profile
  const fetchMyProfile = useCallback(async () => {
    if (!user) return null;

    try {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Update booster status and discovery settings from profile
      if (myProfile) {
        setBoosterActive(myProfile.booster_active || false);
        setBoosterExpiresAt(myProfile.booster_expires_at || null);
        setBoostCredits(myProfile.boost_credits || 0);
        setInstantMessageCredits(myProfile.instant_message_credits || 0);
        setTravelModeActive(myProfile.travel_mode_active || false);
        setTravelLatitude(myProfile.travel_latitude || null);
        setTravelLongitude(myProfile.travel_longitude || null);
        setTravelCity(myProfile.travel_city || null);
        setMyProfile(myProfile as Profile);
      }

      return myProfile;
    } catch (error) {
      logger.error("Error fetching my profile:", error);
      return null;
    }
  }, [user]);

  // Fetch superlike count
  const fetchSuperlikeCount = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = (await supabase
        .from("profiles")
        .select("superlikes_remaining")
        .eq("id", user.id)
        .single()) as { data: { superlikes_remaining: number } | null; error: unknown };

      if (error) throw error;
      setSuperlikesRemaining(data?.superlikes_remaining || 0);
    } catch (error) {
      logger.error("Error fetching superlike count:", error);
    }
  }, [user]);

  // Check subscription and swipe limits
  const checkSwipeLimit = useCallback(async () => {
    try {
      if (!user) return;

      // Get remaining swipes and subscription status
      const { data, error } = (await supabase.rpc("get_remaining_swipes", {
        user_id: user.id,
      })) as {
        data: { remaining_swipes: number; minutes_until_reset: number; is_premium: boolean } | null;
        error: unknown;
      };

      if (error) throw error;

      if (data) {
        setSwipeLimit({
          remainingSwipes: data.remaining_swipes,
          minutesUntilReset: Math.ceil(data.minutes_until_reset),
          isPremium: data.is_premium,
        });
      }

      // Also fetch superlike count
      await fetchSuperlikeCount();
    } catch (error) {
      logger.error("Error checking swipe limits:", error);
    }
  }, [user, fetchSuperlikeCount]);

  // Fetch rewind count
  const fetchRewindCount = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = (await supabase
        .from("profiles")
        .select("rewinds_remaining")
        .eq("id", user.id)
        .single()) as { data: { rewinds_remaining: number } | null; error: unknown };

      if (error) {
        // Column doesn't exist yet, default to 3
        logger.warn("rewinds_remaining column not found, using default value");
        setRewindsRemaining(3);
        return;
      }
      setRewindsRemaining(data?.rewinds_remaining || 3);
    } catch (error) {
      logger.error("Error fetching rewind count:", error);
      setRewindsRemaining(3); // Default value
    }
  }, [user]);

  // Helpers to persist passed/liked IDs in sessionStorage so component remounts don't undo them
  const addLocalExcluded = useCallback(
    (id: string) => {
      if (!user?.id) return;
      const key = `local_excluded_${user.id}`;
      try {
        const existing: string[] = JSON.parse(sessionStorage.getItem(key) ?? "[]");
        sessionStorage.setItem(key, JSON.stringify([...new Set([...existing, id])]));
      } catch {
        /* ignore */
      }
    },
    [user?.id]
  );

  const getLocalExcluded = useCallback((): Set<string> => {
    if (!user?.id) return new Set();
    const key = `local_excluded_${user.id}`;
    try {
      return new Set(JSON.parse(sessionStorage.getItem(key) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  }, [user?.id]);

  const removeLocalExcluded = useCallback(
    (id: string) => {
      if (!user?.id) return;
      const key = `local_excluded_${user.id}`;
      try {
        const existing: string[] = JSON.parse(sessionStorage.getItem(key) ?? "[]");
        sessionStorage.setItem(key, JSON.stringify(existing.filter((x) => x !== id)));
      } catch {
        /* ignore */
      }
    },
    [user?.id]
  );

  // Load liked profiles from database
  const loadLikedProfiles = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("likes")
        .select("liked_id, action")
        .eq("liker_id", user.id);

      if (error) throw error;

      const likedIds = data ? data.filter((l) => l.action !== "pass").map((l) => l.liked_id) : [];
      const passedIds = data ? data.filter((l) => l.action === "pass").map((l) => l.liked_id) : [];

      // Also fetch matched user IDs so they are excluded from discovery
      const { data: matchData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const matchedIds = (matchData || []).map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      const allExcluded = new Set([...likedIds, ...passedIds, ...matchedIds]);
      setLikedProfiles(new Set([...likedIds, ...matchedIds]));
      const localExcluded = getLocalExcluded();
      setPassedProfiles(new Set([...passedIds, ...localExcluded]));
      logger.log(
        "Loaded liked profiles:",
        likedIds.length,
        "passed:",
        passedIds.length,
        "matched:",
        matchedIds.length
      );
    } catch (error) {
      logger.error("Error loading liked profiles:", error);
    }
  }, [user, getLocalExcluded]);

  // Fetch profile views (users who viewed your profile)
  const fetchProfileViews = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profile_views")
        .select(
          `
          viewer_id,
          viewed_at,
          profiles!profile_views_viewer_id_fkey (
            id,
            full_name,
            age,
            profile_image_url,
            bio,
            location,
            profile_images,
            verified,
            is_premium,
            work,
            education,
            height,
            height_cm,
            zodiac_sign,
            religion,
            interests,
            looking_for,
            lifestyle,
            drinking,
            smoking,
            pets,
            latitude,
            longitude,
            city,
            country,
            mood_emoji,
            mood_text,
            video_intro_url,
            soundtrack_url,
            soundtrack_source,
            soundtrack_title,
            soundtrack_artist
          )
        `
        )
        .eq("viewed_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(50);

      if (error) {
        logger.error("Error fetching profile views:", error);
        setProfileViews([]);
        return;
      }

      if (data) {
        const viewers = data
          .filter((view) => view.profiles)
          .map((view) => ({
            ...(view.profiles as unknown as Profile),
            timestamp: view.viewed_at,
          }));
        setProfileViews(viewers);
      }
    } catch (error) {
      logger.error("Error fetching profile views:", error);
      setProfileViews([]);
    }
  }, [user]);

  // Fetch profile likes (users who liked you)
  const fetchProfileLikes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("likes")
        .select(
          `
          liker_id,
          created_at,
          profiles!likes_liker_id_fkey (
            id,
            full_name,
            age,
            profile_image_url,
            bio,
            location,
            profile_images,
            verified,
            is_premium,
            work,
            education,
            height,
            height_cm,
            zodiac_sign,
            religion,
            interests,
            looking_for,
            lifestyle,
            drinking,
            smoking,
            pets,
            latitude,
            longitude,
            city,
            country,
            mood_emoji,
            mood_text,
            video_intro_url,
            soundtrack_url,
            soundtrack_source,
            soundtrack_title,
            soundtrack_artist
          )
        `
        )
        .eq("liked_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const likers = data
          .filter((like) => like.profiles)
          .map((like) => ({
            ...(like.profiles as unknown as Profile),
            timestamp: like.created_at,
          }));
        setProfileLikes(likers);
      }
    } catch (error) {
      logger.error("Error fetching profile likes:", error);
      setProfileLikes([]);
    }
  }, [user]);

  // Fetch profiles for discovery — uses server-side RPC to avoid downloading
  // the entire profiles table. All filters run in PostgreSQL; only 50 rows
  // are returned per call. When the card stack runs low the component calls
  // fetchMoreProfiles() which advances the offset.
  const discoverOffset = useRef(0);

  const fetchProfiles = useCallback(
    async (offset = 0) => {
      if (!user) return;

      try {
        setLoading(true);

        const myProfile = await fetchMyProfile();
        if (!myProfile) {
          navigate("/profile-setup");
          return;
        }

        // Effective coordinates: prefer travel-mode location
        const userLat: number =
          (myProfile.travel_mode_active && myProfile.travel_latitude
            ? myProfile.travel_latitude
            : myProfile.latitude) ?? 0;
        const userLon: number =
          (myProfile.travel_mode_active && myProfile.travel_longitude
            ? myProfile.travel_longitude
            : myProfile.longitude) ?? 0;

        const { data, error } = await supabase.rpc("get_discover_profiles", {
          current_user_id: user.id,
          user_latitude: userLat,
          user_longitude: userLon,
          p_min_age: filters.minAge,
          p_max_age: filters.maxAge,
          p_max_distance_km: filters.maxDistance,
          p_gender_pref: myProfile.gender_preference || filters.gender || "everyone",
          p_my_gender: myProfile.gender || "",
          p_is_premium: swipeLimit.isPremium,
          p_verified_only: filters.verifiedOnly,
          p_has_profile_image: filters.hasProfileImage,
          p_interests: filters.specificInterests,
          p_min_height: filters.minHeight,
          p_max_height: filters.maxHeight,
          p_education: filters.education,
          p_smoking: filters.smoking,
          p_drinking: filters.drinking,
          p_religion: filters.religion,
          p_looking_for: filters.lookingFor,
          p_zodiac_sign: filters.zodiacSign,
          p_offset: offset,
          p_limit: 50,
        });

        if (error) {
          // Graceful fallback: RPC not yet deployed — tell the user to run migration
          const rpcError = error as { code?: string; message?: string };
          if (rpcError.code === "PGRST202" || rpcError.message?.includes("not found")) {
            logger.error("get_discover_profiles RPC not found — run migration 20260517000001");
            toast.error(t("discover.discoveryUpdateRequired"));
            return;
          }
          throw error;
        }

        const fetched: Profile[] = (data || []).map((p: Record<string, unknown>) => ({
          ...p,
          interests: p.interests || [],
        }));

        const sorted = filters.smartSort
          ? [...fetched].sort(
              (a, b) => computeMatchScore(b, myProfile) - computeMatchScore(a, myProfile)
            )
          : fetched;

        if (offset === 0) {
          discoverOffset.current = sorted.length;
          setProfiles(sorted);
          cacheProfiles(sorted);
          setCurrentProfileIndex(0);
        } else {
          discoverOffset.current = offset + sorted.length;
          setProfiles((prev) => [...prev, ...sorted]);
        }
      } catch (error) {
        logger.error("Error in fetchProfiles:", error);
        toast.error(t("discover.failedLoad"));
      } finally {
        setLoading(false);
      }
    },
    [user, filters, fetchMyProfile, navigate, swipeLimit.isPremium, cacheProfiles, t]
  );

  // Automatically fetch the next page when fewer than 5 cards remain
  const fetchMoreProfiles = useCallback(() => {
    if (!loading) {
      fetchProfiles(discoverOffset.current);
    }
  }, [loading, fetchProfiles]);

  // Fetch spotlight/boosted profiles
  const fetchSpotlightProfiles = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's location first
      const myProfile = await fetchMyProfile();

      // Determine which coordinates to use (travel or regular)
      const userLat =
        myProfile?.travel_mode_active && myProfile?.travel_latitude
          ? myProfile.travel_latitude
          : myProfile?.latitude;
      const userLon =
        myProfile?.travel_mode_active && myProfile?.travel_longitude
          ? myProfile.travel_longitude
          : myProfile?.longitude;

      if (!myProfile || !userLat || !userLon) {
        logger.log("Cannot fetch spotlight profiles: user location not available");
        return;
      }

      const { data, error } = (await supabase.rpc("get_spotlight_profiles", {
        current_user_id: user.id,
        user_latitude: userLat,
        user_longitude: userLon,
        max_distance_km: filters.maxDistance,
      })) as { data: Profile[] | null; error: unknown };

      if (error) {
        const errorObj = error as { code?: string; message?: string };
        // Silently handle missing function (user hasn't run migration yet)
        if (errorObj.code === "PGRST202" || errorObj.message?.includes("not found")) {
          logger.log(
            "Spotlight function not available yet. Run migration: 20251031_add_spotlight_profiles_function.sql"
          );
          return;
        }
        logger.error("Error fetching spotlight profiles:", error);
        return;
      }

      if (data) {
        // Add distance to spotlight profiles
        const profilesWithDistance = data
          .map((profile: Profile) => {
            let distance_km = undefined;
            if (userLat && userLon) {
              // Check if the profile user is in travel mode and use their travel coordinates
              const profileLat =
                profile.travel_mode_active && profile.travel_latitude
                  ? profile.travel_latitude
                  : profile.latitude;
              const profileLon =
                profile.travel_mode_active && profile.travel_longitude
                  ? profile.travel_longitude
                  : profile.longitude;

              if (profileLat && profileLon) {
                distance_km = calculateDistance(userLat, userLon, profileLat, profileLon);
              }
            }

            return {
              ...profile,
              distance_km,
              interests: profile.interests || [],
            };
          })
          .filter((profile: Profile) => {
            // Exclude already liked/passed profiles
            if (likedProfiles.has(profile.id) || passedProfiles.has(profile.id)) return false;

            // Apply gender filter (mutual matching)
            const myGenderPref = (
              myProfile?.gender_preference ||
              filters.gender ||
              "everyone"
            ).toLowerCase();
            const myGender = (myProfile?.gender || "").toLowerCase();
            const theirGenderPref = (profile.gender_preference || "everyone").toLowerCase();
            const theirGender = (profile.gender || "").toLowerCase();

            // 1. Do I want to see their gender? (skip if their gender is unknown)
            if (myGenderPref !== "everyone" && theirGender && theirGender !== myGenderPref) {
              return false;
            }
            // 2. Do they want to see my gender? (skip if their preference is unknown)
            if (theirGenderPref !== "everyone" && myGender && myGender !== theirGenderPref) {
              return false;
            }

            // Filter spotlight profiles by distance when in travel mode or always
            if (profile.distance_km !== undefined && profile.distance_km > filters.maxDistance) {
              logger.log(
                `🚫 Filtering out spotlight ${profile.full_name}: ${Math.round(profile.distance_km)}km > ${filters.maxDistance}km`
              );
              return false;
            }
            return true;
          });

        logger.log(`Found ${profilesWithDistance.length} boosted profiles`);
        setSpotlightProfiles(profilesWithDistance);
      }
    } catch (error) {
      logger.error("Error fetching spotlight profiles:", error);
    }
  }, [user, filters.maxDistance, filters.gender, fetchMyProfile, likedProfiles, passedProfiles]);

  const { buyProduct } = usePurchases();

  // Handle premium upgrade
  const handleUpgrade = () => buyProduct(PRODUCT_IDS.PREMIUM_MONTHLY);

  // Handle like action
  const handleLike = async (profileId: string) => {
    if (!user) return;
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);
    // Rate limit: 1 like per 500ms — check BEFORE recording history to avoid phantom rewind entries
    const now = Date.now();
    if (now - lastLikeTime.current < 500) return;
    lastLikeTime.current = now;
    // Track for rewind after rate-limit passes
    setLastActionHistory((prev) => [
      ...prev,
      { type: "like" as const, profileId, timestamp: Date.now() },
    ]);
    analytics.like(profileId);

    // Optimistically advance to the next card immediately — reverted on failure
    const preSwipeIndex = currentProfileIndex;
    setCurrentProfileIndex((prev) => prev + 1);
    setCardImageIndex(0); // reset photo index for new card

    try {
      // Use the like_user RPC function which handles swipe limits
      const { data, error } = (await supabase.rpc("like_user", {
        current_user_id: user.id,
        target_user_id: profileId,
      })) as {
        data: {
          success: boolean;
          error?: string;
          remaining_swipes: number;
          minutes_until_reset: number;
          is_premium: boolean;
          is_match: boolean;
        } | null;
        error: unknown;
      };

      if (error) {
        logger.error("Supabase RPC error:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from like_user function");
      }

      logger.log("Like user response:", data);

      if (!data.success) {
        // Revert optimistic advance — user hasn't actually consumed a swipe
        setCurrentProfileIndex(preSwipeIndex);
        // Show upgrade dialog if out of swipes
        setShowUpgradeDialog(true);
        toast.info(data.error || "Out of swipes!");
        // Schedule a midnight push so user knows when swipes reset (once per session)
        if (!swipeResetPushScheduled.current) {
          swipeResetPushScheduled.current = true;
          const midnight = new Date();
          midnight.setHours(24, 0, 5, 0);
          supabase
            .from("scheduled_push_notifications")
            .insert({
              target_user_id: user.id,
              title: "Your swipes are back! 🦅",
              body: "10 new swipes ready — discover someone new on Shqiponja",
              url: "/discover",
              status: "pending",
              send_at: midnight.toISOString(),
            })
            .then(() => {})
            .catch(() => {});
        }
        return;
      }

      // Update local swipe limit state
      setSwipeLimit({
        remainingSwipes: data.remaining_swipes || 0,
        minutesUntilReset: Math.ceil(data.minutes_until_reset || 0),
        isPremium: data.is_premium || false,
      });

      // Add to liked profiles
      setLikedProfiles((prev) => new Set([...prev, profileId]));

      // Handle match if it occurred
      if (data.is_match) {
        markMatchHandled(profileId); // prevent global overlay from double-firing
        const matchedUserProfile = profiles.find((p) => p.id === profileId);
        if (matchedUserProfile) {
          setMatchedProfile(matchedUserProfile);
          setIsPremiumRosesMatch(false); // Regular match
          setShowMatchAnimation(true);
        }
        // Fetch the newly created match ID so user can jump straight to chat
        const [u1, u2] = user.id < profileId ? [user.id, profileId] : [profileId, user.id];
        supabase
          .from("matches")
          .select("id")
          .eq("user1_id", u1)
          .eq("user2_id", u2)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data: matchRow }) => {
            if (matchRow) setMatchedMatchId(matchRow.id);
          });
        toast.success(t("discover.itsAMatch") + " 🎉");
        // Notify the other person of match (fire-and-forget)
        supabase.functions
          .invoke("send-push", {
            body: {
              user_id: profileId,
              title: "It's a match! 💜",
              body: "You matched on Shqiponja — say hello!",
              url: "/matches",
            },
          })
          .catch((err) => logger.error("send-push (match) failed:", err));
      } else {
        toast.success(t("discover.profileLiked"));
        // Notify the liked person (fire-and-forget)
        supabase.functions
          .invoke("send-push", {
            body: {
              user_id: profileId,
              title: "Someone liked your profile! 🦅",
              body: "You have a new like on Shqiponja — tap to see who",
              url: "/who-liked-you",
            },
          })
          .catch((err) => logger.error("send-push (like) failed:", err));
      }
    } catch (error) {
      // Revert optimistic advance on network / server error
      setCurrentProfileIndex(preSwipeIndex);
      logger.error("Error liking profile:", error);
      const errorMessage = (error as { message?: string } | null)?.message ?? "Unknown error";
      toast.error(t("discover.failedToLike", { error: errorMessage }));
    }
  };
  // Keep ref in sync so handleSwipeEnd always calls the latest version
  useLayoutEffect(() => {
    handleLikeRef.current = handleLike;
  });

  // Handle superlike action
  const handleSuperlike = async () => {
    // Haptic feedback — stronger for superlike
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    if (!user || !currentProfile) return;
    // Rate limit: 1 superlike per 1s
    const now = Date.now();
    if (now - lastSuperlikeTime.current < 1000) return;
    lastSuperlikeTime.current = now;

    // Check if user has superlikes
    if (superlikesRemaining <= 0) {
      setShowSuperlikeDialog(true);
      return;
    }

    setIsSuperliking(true);
    const profileId = currentProfile.id;

    try {
      // Use superlike
      const { data: usageData, error: usageError } = (await supabase.rpc("use_superlike", {
        p_user_id: user.id,
      })) as { data: { success: boolean; superlikes_remaining: number } | null; error: unknown };

      if (usageError) throw usageError;

      if (!usageData?.success) {
        setShowSuperlikeDialog(true);
        return;
      }

      // Update superlike count
      setSuperlikesRemaining(usageData.superlikes_remaining || 0);

      // Use like_user RPC with is_superlike flag — enforces swipe limits & atomic match creation
      const { data: likeData, error: likeError } = (await supabase.rpc("like_user", {
        current_user_id: user.id,
        target_user_id: profileId,
        p_is_superlike: true,
      })) as {
        data: {
          success: boolean;
          error?: string;
          remaining_swipes: number;
          minutes_until_reset: number;
          is_premium: boolean;
          is_match: boolean;
        } | null;
        error: unknown;
      };

      if (likeError) throw likeError;

      if (!likeData) {
        throw new Error("No data returned from like_user function");
      }

      if (!likeData.success) {
        // Swipe limit reached even for superlike
        setShowUpgradeDialog(true);
        toast.info(likeData.error || "Out of swipes!");
        return;
      }

      // Update local swipe limit state
      setSwipeLimit({
        remainingSwipes: likeData.remaining_swipes || 0,
        minutesUntilReset: Math.ceil(likeData.minutes_until_reset || 0),
        isPremium: likeData.is_premium || false,
      });

      if (likeData.is_match) {
        markMatchHandled(profileId); // prevent global overlay from double-firing
        const matchedUserProfile = profiles.find((p) => p.id === profileId);
        if (matchedUserProfile) {
          setMatchedProfile(matchedUserProfile);
          setIsPremiumRosesMatch(false);
          setShowMatchAnimation(true);
        }
        // Fetch match ID for chat navigation
        const [u1, u2] = user.id < profileId ? [user.id, profileId] : [profileId, user.id];
        supabase
          .from("matches")
          .select("id")
          .eq("user1_id", u1)
          .eq("user2_id", u2)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data: matchRow }) => {
            if (matchRow) setMatchedMatchId(matchRow.id);
          });
        toast.success(t("discover.itsAMatch") + " 🎉");
      } else {
        toast.success(t("discover.superlikeSent"));
      }

      // Add to liked profiles
      setLikedProfiles((prev) => new Set([...prev, profileId]));

      // Move to next profile
      setCurrentProfileIndex((prev) => prev + 1);
    } catch (error) {
      logger.error("Error sending superlike:", error);
      if (!navigator.onLine) {
        enqueue({
          table: "like_user",
          method: "rpc",
          payload: { current_user_id: user.id, target_user_id: currentProfile.id },
        });
        toast.info(t("discover.superlikeOffline"));
        setCurrentProfileIndex((prev) => prev + 1);
      } else {
        toast.error(t("discover.failedSuperlike"));
      }
    } finally {
      setIsSuperliking(false);
    }
  };

  // Premium Roses - Instant Match
  const handlePremiumRoses = async () => {
    if (!user || !rosesTargetProfile) return;

    if (walletBalance < 1) {
      toast.error(t("discover.notEnoughCoins"));
      return;
    }

    logger.log("🌹 Sending Premium Roses to:", rosesTargetProfile.full_name);

    try {
      const profileId = rosesTargetProfile.id;

      // Check if match already exists
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existingMatch) {
        toast.info(t("discover.alreadyMatched"));
        setShowPremiumRosesDialog(false);
        return;
      }

      // Premium Roses: Only create like from current user (no need for reciprocal like)
      // The match will be created directly, bypassing normal mutual-like requirement
      logger.log("💝 Creating your like (Premium Roses bypass mutual requirement)...");

      // Delete any existing likes first to avoid conflicts
      await supabase.from("likes").delete().eq("liker_id", user.id).eq("liked_id", profileId);

      const { error: likeError } = await supabase.from("likes").insert({
        liker_id: user.id,
        liked_id: profileId,
      });

      if (likeError) {
        logger.error("Error creating like:", likeError);
        // Don't throw - Premium Roses should create match regardless
        logger.log("⚠️ Like creation failed, but continuing with Premium Roses match...");
      }

      // Create match with special rose type
      logger.log("💐 Creating Premium Roses match...");
      const [u1, u2] = user.id < profileId ? [user.id, profileId] : [profileId, user.id];
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .insert({
          user1_id: u1,
          user2_id: u2,
          special_match_type: "premium_roses",
        })
        .select()
        .single();

      if (matchError) {
        logger.error("Error creating match:", matchError);
        throw matchError;
      }

      // Deduct coin - use current DB balance to avoid stale-state race condition
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      const currentBalance = (walletData as { balance: number } | null)?.balance ?? walletBalance;
      await supabase
        .from("wallets")
        .update({ balance: Math.max(currentBalance - 1, 0), updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await supabase
        .from("wallet_transactions")
        .insert({ user_id: user.id, amount: -1, type: "spend", item: "premium_roses" });
      setWalletBalance((prev) => Math.max(prev - 1, 0));

      logger.log("✅ Premium Roses match created successfully!", matchData);

      // Migrate any pre-existing instant messages into the match chat so conversation history
      // is preserved and not left as an orphaned IM thread
      if (matchData?.id) {
        await supabase.rpc("migrate_instant_messages_to_match", {
          p_match_id: matchData.id,
          p_user1_id: user.id,
          p_user2_id: profileId,
        });
      }

      // Show match animation with Premium Roses theme
      markMatchHandled(profileId); // prevent global overlay from double-firing
      setMatchedProfile(rosesTargetProfile);
      setIsPremiumRosesMatch(true);
      setShowMatchAnimation(true);
      if (matchData?.id) setMatchedMatchId(matchData.id);

      toast.success(t("discover.rosesSent"));

      // Add to liked profiles so they're excluded from discovery
      setLikedProfiles((prev) => new Set([...prev, profileId]));

      // Remove the profile from the profiles array and update cache
      setProfiles((prev) => {
        const updated = prev.filter((p) => p.id !== profileId);
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify(updated.slice(0, 100)));
        }
        return updated;
      });

      // Close dialog
      setShowPremiumRosesDialog(false);
      setRosesTargetProfile(null);
    } catch (error: unknown) {
      logger.error("❌ Error sending premium roses:", error);
      const err = error as { message?: string; details?: string; hint?: string };
      logger.error("Error details:", err?.message, err?.details, err?.hint);
      toast.error(err?.message || "Failed to send premium roses");
    }
  };

  // Purchase superlikes via Wallet (Google Play Billing coming soon)
  const handlePurchaseSuperlikes = (_amount: number) => {
    setShowSuperlikeDialog(false);
    toast.info(
      t("discover.superlikePurchaseRedirect") || "Purchase superlikes with coins in your Wallet"
    );
    navigate("/wallet");
  };

  // Handle pass action
  // Helper to persist excluded profile IDs in sessionStorage so remounts don't bring them back
  const handlePass = async (profileId: string) => {
    if (!user) return;
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
    analytics.pass(profileId);

    // Cache locally BEFORE async DB write so remounts during await don't bring it back
    addLocalExcluded(profileId);
    setPassedProfiles((prev) => new Set([...prev, profileId]));
    // Track immediately for rewind (before async so rewind works right away)
    setLastActionHistory((prev) => [
      ...prev,
      { type: "pass" as const, profileId, timestamp: Date.now() },
    ]);
    setCurrentProfileIndex((prev) => prev + 1);

    try {
      // Check swipe limits
      const { data, error } = (await supabase.rpc("get_remaining_swipes", {
        user_id: user.id,
      })) as {
        data: { remaining_swipes: number; minutes_until_reset: number; is_premium: boolean } | null;
        error: unknown;
      };

      if (error) {
        logger.error("Error checking swipe limits:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from get_remaining_swipes");
      }

      logger.log("Swipe limits:", data);

      // Update swipe limit state
      setSwipeLimit({
        remainingSwipes: data.remaining_swipes || 0,
        minutesUntilReset: Math.ceil(data.minutes_until_reset || 0),
        isPremium: data.is_premium || false,
      });

      // Store pass in database so it persists across sessions — always, even when out of swipes,
      // so the profile doesn't reappear in the next session.
      const { error: passError } = await supabase
        .from("likes")
        .upsert(
          { liker_id: user.id, liked_id: profileId, action: "pass" },
          { onConflict: "liker_id,liked_id" }
        );

      if (passError) {
        logger.error("Error storing pass:", passError);
      }

      toast.success(t("discover.profilePassed"));

      // Show upgrade dialog if out of swipes (after persisting so the pass is saved regardless)
      if (!data.is_premium && data.remaining_swipes <= 0) {
        setShowUpgradeDialog(true);
        toast.info(t("discover.outOfSwipes"));
        return;
      }

      // Increment swipe count in database for non-premium users
      if (!data.is_premium) {
        const newCount = Math.max(0, 10 - (data.remaining_swipes - 1));
        await supabase.from("daily_swipes").upsert(
          {
            user_id: user.id,
            swipe_count: newCount,
            last_reset: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

        // Update local state
        setSwipeLimit((prev) => ({
          ...prev,
          remainingSwipes: Math.max(0, prev.remainingSwipes - 1),
        }));
      }
    } catch (error) {
      logger.error("Error passing profile:", error);
      const errorMessage = (error as { message?: string } | null)?.message ?? "Unknown error";
      toast.error(t("discover.failedToPass", { error: errorMessage }));
    }
  };
  // Keep ref in sync so handleSwipeEnd always calls the latest version
  useLayoutEffect(() => {
    handlePassRef.current = handlePass;
  });

  // Handle rewind (undo last action)
  const handleRewind = async () => {
    if (!user || lastActionHistory.length === 0 || rewindsRemaining <= 0) {
      if (rewindsRemaining <= 0) {
        toast.error(t("discover.noRewinds"));
      }
      return;
    }

    try {
      const lastAction = lastActionHistory[lastActionHistory.length - 1];

      // Undo the last action in the database
      if (lastAction.type === "like") {
        // Remove the like
        await supabase
          .from("likes")
          .delete()
          .eq("liker_id", user.id)
          .eq("liked_id", lastAction.profileId);

        // Also delete any match that was created from this like
        const { error: matchDeleteError } = await supabase
          .from("matches")
          .delete()
          .or(
            `and(user1_id.eq.${user.id},user2_id.eq.${lastAction.profileId}),and(user1_id.eq.${lastAction.profileId},user2_id.eq.${user.id})`
          );

        if (matchDeleteError) {
          logger.warn("Could not delete match on rewind:", matchDeleteError);
        }

        // Remove from local state
        setLikedProfiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lastAction.profileId);
          return newSet;
        });
      }
      // Delete pass from DB and remove from local state
      else if (lastAction.type === "pass") {
        await supabase
          .from("likes")
          .delete()
          .eq("liker_id", user.id)
          .eq("liked_id", lastAction.profileId)
          .eq("action", "pass");

        removeLocalExcluded(lastAction.profileId);
        setPassedProfiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lastAction.profileId);
          return newSet;
        });
      }

      // Decrease rewind count in database (if column exists)
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ rewinds_remaining: rewindsRemaining - 1 } as never)
          .eq("id", user.id);

        if (error && !error.message?.includes("does not exist")) {
          throw error;
        }
      } catch (dbError) {
        logger.warn("Could not update rewinds_remaining in database:", dbError);
      }

      // Update local state
      setRewindsRemaining((prev) => prev - 1);

      // Go back one profile
      setCurrentProfileIndex((prev) => Math.max(0, prev - 1));

      // Remove last action from history
      setLastActionHistory((prev) => prev.slice(0, -1));

      toast.success(`${lastAction.type === "like" ? "Like" : "Pass"} undone!`);
    } catch (error) {
      logger.error("Error rewinding:", error);
      toast.error(t("discover.failedUndo"));
    }
  };

  // Handle instant message
  const handleInstantMessage = (profile: Profile) => {
    if (instantMessageCredits <= 0) {
      toast.error(t("discover.noImCredits"));
      return;
    }
    setInstantMessageTargetProfile(profile);
    setInstantMessageText("");
    setShowInstantMessageDialog(true);
  };

  const sendInstantMessage = async () => {
    if (!user || !instantMessageTargetProfile || !instantMessageText.trim()) {
      toast.error(t("discover.writeMessage"));
      return;
    }

    try {
      const { data, error } = (await supabase.rpc("send_instant_message", {
        sender_user_id: user.id,
        receiver_user_id: instantMessageTargetProfile.id,
        message_text: instantMessageText.trim(),
      })) as {
        data: {
          success: boolean;
          error?: string;
          credits_remaining?: number;
          match_id?: string;
        } | null;
        error: unknown;
      };

      if (error) {
        logger.error("Supabase error:", error);
        throw error;
      }

      if (data && !data.success) {
        // If they're already matched, redirect to the match chat instead of wasting a credit
        if (data.error === "already_matched" && data.match_id) {
          setShowInstantMessageDialog(false);
          setInstantMessageText("");
          setInstantMessageTargetProfile(null);
          toast.info(t("discover.alreadyMatched"));
          navigate(`/chat/${data.match_id}`);
          return;
        }
        toast.error(data.error || "Failed to send instant message");
        return;
      }

      if (data && data.success) {
        setInstantMessageCredits(data.credits_remaining || 0);
        toast.success(t("discover.messageSent", { name: instantMessageTargetProfile.full_name }));
        setShowInstantMessageDialog(false);
        setInstantMessageText("");
        setInstantMessageTargetProfile(null);
      }
    } catch (error) {
      logger.error("Error sending instant message:", error);
      logger.error("Error details:", JSON.stringify(error, null, 2));
      toast.error(t("discover.failedMessage"));
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      // Sign out first
      await supabase.auth.signOut();
      // Then navigate to auth page
      navigate("/auth", { replace: true });
    } catch (error) {
      logger.error("Sign out error:", error);
      // Navigate anyway even if sign out fails
      navigate("/auth", { replace: true });
    }
  };

  // Handle opening filter sheet
  const handleOpenFilterSheet = () => {
    // Copy current filters to temp filters
    setTempFilters({ ...filters });
    setShowFilterSheet(true);
  };

  // Handle closing filter sheet — warn if there are unsaved changes
  const handleFilterSheetOpenChange = (open: boolean) => {
    if (!open) {
      const hasChanges = JSON.stringify(tempFilters) !== JSON.stringify(filters);
      if (hasChanges) {
        setShowFilterDiscardConfirm(true);
        return;
      }
    }
    setShowFilterSheet(open);
  };

  // Handle saving filters
  const handleSaveFilters = () => {
    // Apply temp filters to actual filters
    setFilters({ ...tempFilters });
    // Close the sheet
    setShowFilterSheet(false);
    // Filters will automatically trigger refetch via useEffect

    // Persist gender preference to DB so it stays in sync with Settings
    if (user && tempFilters.gender !== filters.gender) {
      supabase
        .from("profiles")
        .update({ gender_preference: tempFilters.gender })
        .eq("id", user.id)
        .then(() => {});
    }
  };

  // Handle opening notifications - mark as seen
  const handleOpenNotifications = () => {
    // Calculate current total notifications
    const totalNotifications = profileViews.length + profileLikes.length;

    // Mark current count as "seen"
    setLastSeenNotificationCount(totalNotifications);

    // Reset notification badge to 0
    setNotificationCount(0);

    // Open the dialog
    setShowNotifications(true);
  };

  // Memoize data initialization to prevent recreation on every render
  const initializeData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Clean up old cache key format (without travel suffix)
      localStorage.removeItem(`discover_profiles_cache_${user.id}`);

      // 1. Load liked profiles + matched users from database
      const { data: likesData } = await supabase
        .from("likes")
        .select("liked_id, action")
        .eq("liker_id", user.id);

      const likedIds = likesData
        ? likesData.filter((l) => l.action !== "pass").map((l) => l.liked_id)
        : [];
      const passedIds = likesData
        ? likesData.filter((l) => l.action === "pass").map((l) => l.liked_id)
        : [];

      // Also fetch matched user IDs so they are excluded from discovery
      const { data: matchData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const matchedIds = (matchData || []).map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      const localExcluded = getLocalExcluded();
      const allPassed = new Set([...passedIds, ...localExcluded]);
      const allExcluded = new Set([...likedIds, ...allPassed, ...matchedIds]);
      setLikedProfiles(new Set([...likedIds, ...matchedIds]));
      setPassedProfiles(allPassed);
      logger.log(
        "Loaded liked profiles:",
        likedIds.length,
        "passed:",
        allPassed.size,
        "matched:",
        matchedIds.length
      );

      // 2. Check swipe limits and premium status
      const { data: swipeData } = (await supabase.rpc("get_remaining_swipes", {
        user_id: user.id,
      })) as {
        data: { remaining_swipes: number; minutes_until_reset: number; is_premium: boolean } | null;
      };

      // Also check premium status directly from profile to ensure accuracy
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_premium, superlikes_remaining")
        .eq("id", user.id)
        .single();

      const actualPremiumStatus = profileData?.is_premium || swipeData?.is_premium || false;
      setSuperlikesRemaining(profileData?.superlikes_remaining ?? 0);

      if (swipeData) {
        setSwipeLimit({
          remainingSwipes: swipeData.remaining_swipes,
          minutesUntilReset: Math.ceil(swipeData.minutes_until_reset),
          isPremium: actualPremiumStatus,
        });
      }

      // 2.5. Fetch spotlight profiles
      const myProfileForSpotlight = await fetchMyProfile();

      // Determine which coordinates to use (travel or regular)
      const userLatForSpotlight =
        myProfileForSpotlight?.travel_mode_active && myProfileForSpotlight?.travel_latitude
          ? myProfileForSpotlight.travel_latitude
          : myProfileForSpotlight?.latitude;
      const userLonForSpotlight =
        myProfileForSpotlight?.travel_mode_active && myProfileForSpotlight?.travel_longitude
          ? myProfileForSpotlight.travel_longitude
          : myProfileForSpotlight?.longitude;

      if (userLatForSpotlight && userLonForSpotlight) {
        const { data: spotlightData, error: spotlightError } = (await supabase.rpc(
          "get_spotlight_profiles",
          {
            current_user_id: user.id,
            user_latitude: userLatForSpotlight,
            user_longitude: userLonForSpotlight,
            max_distance_km: filters.maxDistance,
          }
        )) as { data: Profile[] | null; error: unknown };

        // Silently handle missing function
        if (spotlightError) {
          const errorObj = spotlightError as { code?: string; message?: string };
          if (errorObj.code === "PGRST202" || errorObj.message?.includes("not found")) {
            logger.log(
              "Spotlight function not available yet. Run migration: 20251031_add_spotlight_profiles_function.sql"
            );
          } else {
            logger.error("Error fetching spotlight profiles:", spotlightError);
          }
        }

        if (spotlightData && !spotlightError) {
          const spotlightWithDistance = spotlightData
            .map((profile: Profile) => {
              let distance_km = undefined;
              if (userLatForSpotlight && userLonForSpotlight) {
                // Check if the profile user is in travel mode and use their travel coordinates
                const profileLat =
                  profile.travel_mode_active && profile.travel_latitude
                    ? profile.travel_latitude
                    : profile.latitude;
                const profileLon =
                  profile.travel_mode_active && profile.travel_longitude
                    ? profile.travel_longitude
                    : profile.longitude;

                if (profileLat && profileLon) {
                  distance_km = calculateDistance(
                    userLatForSpotlight,
                    userLonForSpotlight,
                    profileLat,
                    profileLon
                  );
                }
              }
              return {
                ...profile,
                distance_km,
                interests: profile.interests || [],
              };
            })
            .filter((profile: Profile) => {
              // Exclude already liked/passed profiles
              if (allExcluded.has(profile.id)) return false;

              // Apply gender filter (mutual matching)
              const myGenderPref = (
                myProfileForSpotlight?.gender_preference ||
                filters.gender ||
                "everyone"
              ).toLowerCase();
              const myGender = (myProfileForSpotlight?.gender || "").toLowerCase();
              const theirGenderPref = (profile.gender_preference || "everyone").toLowerCase();
              const theirGender = (profile.gender || "").toLowerCase();

              // 1. Do I want to see their gender? (skip if their gender is unknown)
              if (myGenderPref !== "everyone" && theirGender && theirGender !== myGenderPref) {
                return false;
              }
              // 2. Do they want to see my gender? (skip if their preference is unknown)
              if (theirGenderPref !== "everyone" && myGender && myGender !== theirGenderPref) {
                return false;
              }

              // Filter spotlight profiles by distance when in travel mode or always
              if (profile.distance_km !== undefined && profile.distance_km > filters.maxDistance) {
                logger.log(
                  `🚫 Filtering out initial spotlight ${profile.full_name}: ${Math.round(profile.distance_km)}km > ${filters.maxDistance}km`
                );
                return false;
              }
              return true;
            });
          logger.log(`Loaded ${spotlightWithDistance.length} spotlight profiles`);
          setSpotlightProfiles(spotlightWithDistance);
        }
      }

      // 3. Fetch profiles (call directly instead of through callback)
      const myProfile = await fetchMyProfile();
      if (!myProfile) {
        navigate("/profile-setup");
        return;
      }

      // Sync gender preference from DB into filters (only during init, not in fetchMyProfile to avoid loops)
      if (myProfile.gender_preference && myProfile.gender_preference !== filters.gender) {
        setFilters((prev) => ({ ...prev, gender: myProfile.gender_preference || "everyone" }));
      }

      // Get excluded IDs (liked + matched)
      const excludedIds = Array.from(allExcluded);

      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .is("deactivated_at", null);

      if (excludedIds.length > 0) {
        query = query.not("id", "in", `(${excludedIds.join(",")})`);
      }

      const { data: profilesData, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      if (profilesData) {
        // Determine which coordinates to use (travel or regular)
        const userLat =
          myProfile.travel_mode_active && myProfile.travel_latitude
            ? myProfile.travel_latitude
            : myProfile.latitude;
        const userLon =
          myProfile.travel_mode_active && myProfile.travel_longitude
            ? myProfile.travel_longitude
            : myProfile.longitude;

        logger.log("🗺️ Init discovery coords:", {
          travelMode: myProfile.travel_mode_active,
          travelLat: myProfile.travel_latitude,
          travelLon: myProfile.travel_longitude,
          homeLat: myProfile.latitude,
          homeLon: myProfile.longitude,
          usingLat: userLat,
          usingLon: userLon,
          travelCity: myProfile.travel_city,
          homeCity: myProfile.city,
          maxDistance: filters.maxDistance,
          profileCount: profilesData.length,
        });

        const profilesWithDistance = profilesData
          .map((profile: Profile) => {
            let distance_km = undefined;
            if (userLat && userLon) {
              // Check if the profile user is in travel mode and use their travel coordinates
              const profileLat =
                profile.travel_mode_active && profile.travel_latitude
                  ? profile.travel_latitude
                  : profile.latitude;
              const profileLon =
                profile.travel_mode_active && profile.travel_longitude
                  ? profile.travel_longitude
                  : profile.longitude;

              if (profileLat && profileLon) {
                distance_km = calculateDistance(userLat, userLon, profileLat, profileLon);
                logger.log(
                  `📍 Init: ${profile.full_name} (${profile.city}) = ${Math.round(distance_km)}km`
                );
              } else {
                logger.log(`📍 Init: ${profile.full_name} (${profile.city}) = NO COORDS`);
              }
            }

            return {
              ...profile,
              distance_km,
              interests: profile.interests || [],
            };
          })
          .filter((profile: Profile) => {
            // Apply gender filter (mutual matching)
            // Prefer DB-stored preference since filters.gender may still be default "everyone"
            const myGenderPref = (
              myProfile.gender_preference ||
              filters.gender ||
              "everyone"
            ).toLowerCase();
            const myGender = (myProfile.gender || "").toLowerCase();
            const theirGenderPref = (profile.gender_preference || "everyone").toLowerCase();
            const theirGender = (profile.gender || "").toLowerCase();

            // 1. Do I want to see their gender? (skip if their gender is unknown)
            if (myGenderPref !== "everyone" && theirGender && theirGender !== myGenderPref) {
              return false;
            }
            // 2. Do they want to see my gender? (skip if my gender is unknown)
            if (theirGenderPref !== "everyone" && myGender && myGender !== theirGenderPref) {
              return false;
            }

            // Apply age filter
            if (profile.age < filters.minAge || profile.age > filters.maxAge) {
              return false;
            }

            // In travel mode, exclude profiles with no coordinates (can't verify proximity)
            if (myProfile.travel_mode_active && profile.distance_km === undefined) {
              logger.log(
                `🚫 Init: Filtering out ${profile.full_name}: no coordinates (travel mode)`
              );
              return false;
            }

            // Apply distance filter
            if (profile.distance_km !== undefined && profile.distance_km > filters.maxDistance) {
              logger.log(
                `🚫 Init: Filtering out ${profile.full_name}: ${Math.round(profile.distance_km)}km > ${filters.maxDistance}km`
              );
              return false;
            }
            return true;
          });

        const sortedProfiles = filters.smartSort
          ? [...profilesWithDistance].sort(
              (a, b) => computeMatchScore(b, myProfile) - computeMatchScore(a, myProfile)
            )
          : profilesWithDistance;

        setProfiles(sortedProfiles);
        cacheProfiles(sortedProfiles);
        setCurrentProfileIndex(0);
      }
    } catch (error) {
      logger.error("Error initializing:", error);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters.maxDistance,
    filters.minAge,
    filters.maxAge,
    filters.gender,
    filters.smartSort,
    navigate,
    fetchMyProfile,
    cacheProfiles,
    getLocalExcluded,
  ]);

  // Initialize - Load data on mount only
  const initRef = useRef(false);
  // Suppress filter-change refetch while initializeData is running (it syncs setFilters internally)
  const isInitializingRef = useRef(false);
  useEffect(() => {
    if (initRef.current || !user) return;
    initRef.current = true;
    isInitializingRef.current = true;
    let cancelled = false;
    initializeData().finally(() => {
      if (!cancelled) isInitializingRef.current = false;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only run once when user is available

  useEffect(() => {
    if (!user) return;
    fetchWallet();
  }, [user, fetchWallet]);

  useEffect(() => {
    loadSavedProfiles();
  }, [loadSavedProfiles]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(
      `lastSeenNotificationCount_${user.id}`,
      lastSeenNotificationCount.toString()
    );
  }, [lastSeenNotificationCount, user]);

  // Auto-update location on page load/login
  useEffect(() => {
    if (!user || !navigator.geolocation) return;

    const updateLocationSilently = async () => {
      // Check travel mode from database to avoid race conditions with state
      const { data: profile } = await supabase
        .from("profiles")
        .select("travel_mode_active")
        .eq("id", user.id)
        .single();

      if (profile?.travel_mode_active) {
        logger.log("Skipping auto-location update: travel mode is active");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use Nominatim reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
              {
                headers: {
                  "User-Agent": "ShqiponjaApp/1.0",
                },
              }
            );

            if (!response.ok) return;

            const data = await response.json();
            const address = data.address;
            const city =
              address.city || address.town || address.village || address.municipality || "";
            const country = address.country || "";

            if (city && country) {
              // Update location in database silently
              await supabase
                .from("profiles")
                .update({
                  city: city,
                  country: country,
                  location: `${city}, ${country}`,
                  latitude: latitude,
                  longitude: longitude,
                })
                .eq("id", user.id);

              logger.log("Location updated automatically:", city, country);
            }
          } catch (error) {
            logger.error("Silent location update failed:", error);
          }
        },
        () => {
          // Fail silently
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    };

    const timer = setTimeout(updateLocationSilently, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  // Subscribe to booster status changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`booster:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as Profile;
          setBoosterActive(newProfile.booster_active || false);
          setBoosterExpiresAt(newProfile.booster_expires_at || null);

          // Show toast when booster expires
          if (!newProfile.booster_active && boosterActive) {
            toast.info(t("discover.spotlightExpired"));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, boosterActive, t]);

  // Subscribe to new matches so matched users are removed from discovery in real-time
  // (e.g. when someone sends you Premium Roses while you're browsing)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`discovery-matches:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user1_id=eq.${user.id}`,
        },
        (payload) => {
          const matchedUserId = (payload.new as { user2_id: string }).user2_id;
          setLikedProfiles((prev) => new Set([...prev, matchedUserId]));
          setProfiles((prev) => prev.filter((p) => p.id !== matchedUserId));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user2_id=eq.${user.id}`,
        },
        (payload) => {
          const matchedUserId = (payload.new as { user1_id: string }).user1_id;
          setLikedProfiles((prev) => new Set([...prev, matchedUserId]));
          setProfiles((prev) => prev.filter((p) => p.id !== matchedUserId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Update booster countdown timer
  useEffect(() => {
    if (!boosterActive || !boosterExpiresAt) {
      setBoosterTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiresAt = new Date(boosterExpiresAt);
      const diffMs = expiresAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setBoosterTimeRemaining("Expired");
        setBoosterActive(false);
        return;
      }

      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setBoosterTimeRemaining(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [boosterActive, boosterExpiresAt]);

  // Get current profile - memoized for performance
  const currentProfile = useMemo(
    () => profiles[currentProfileIndex],
    [profiles, currentProfileIndex]
  );

  // Auto-fetch next page when fewer than 5 cards remain
  const cardsRemaining = profiles.length - currentProfileIndex;
  useEffect(() => {
    if (!loading && cardsRemaining > 0 && cardsRemaining <= 5) {
      fetchMoreProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsRemaining]);

  // Memoized interests for the swipe card — avoids re-rendering on unrelated state changes
  const swipeCardInterests = useMemo(
    () => currentProfile?.interests?.slice(0, 5) ?? [],
    [currentProfile?.id, currentProfile?.interests] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Fetch active stories for current profile
  useEffect(() => {
    if (!currentProfile?.id) {
      setProfileStories([]);
      return;
    }
    const now = new Date().toISOString();
    supabase
      .from("stories")
      .select("id, media_type, media_url, caption, created_at, expires_at")
      .eq("user_id", currentProfile.id)
      .gt("expires_at", now)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setProfileStories((data as StoryItem[]) || []);
      });
  }, [currentProfile?.id]);

  // Refetch profiles when filters change
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    // Skip the very first render (initializeData handles that)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    // Skip if initializeData is still running (it already fetches profiles internally)
    if (isInitializingRef.current) return;
    logger.log("Filters changed, refetching profiles...");
    let cancelled = false;
    fetchProfiles().catch(() => {
      /* cancelled */
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchProfileViews();
      fetchProfileLikes();
      fetchRewindCount();
    }
  }, [user, fetchProfileViews, fetchProfileLikes, fetchRewindCount]);

  // Recompute notification badge whenever views, likes, or the last-seen watermark changes.
  // Separated from fetchProfileLikes so the count is always accurate regardless of fetch order.
  useEffect(() => {
    const totalNotifications = profileViews.length + profileLikes.length;
    const newNotificationCount = Math.max(0, totalNotifications - lastSeenNotificationCount);
    setNotificationCount(newNotificationCount);
    if (
      newNotificationCount > 0 &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("New activity", {
        body: `${newNotificationCount} new ${
          newNotificationCount === 1 ? "notification" : "notifications"
        } on your profile`,
      });
    }
  }, [profileViews.length, profileLikes.length, lastSeenNotificationCount]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-subtle p-4">
        <div className="max-w-sm mx-auto">
          <ProfileCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh pb-24 page-bg"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch" as never,
      }}
    >
      {/* Header */}
      <div className="container mx-auto max-w-2xl p-4">
        <div className="rounded-2xl px-3 py-3 mb-6 glass-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img
                src="/eagle-logo.png"
                alt="Shqiponja"
                className="h-9 w-9 object-contain shrink-0"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] bg-clip-text text-transparent">
                Shqiponja
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  boosterActive ? setShowBoostStatusDialog(true) : setShowBoostDialog(true)
                }
                className={`relative flex items-center justify-center h-9 w-9 rounded-full transition-colors group ${boosterActive ? "bg-primary/10" : "hover:bg-muted"}`}
                aria-label={t("discover.boostAria")}
              >
                <Zap
                  className={`h-6 w-6 ${boosterActive ? "text-primary animate-pulse" : "text-muted-foreground group-hover:text-primary"}`}
                  fill={boosterActive ? "currentColor" : "none"}
                />
                {boosterActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary animate-ping" />
                )}
              </button>
              <button
                onClick={() =>
                  swipeLimit.isPremium ? navigate("/settings") : setShowUpgradeDialog(true)
                }
                className="flex items-center justify-center h-9 w-9 hover:bg-muted rounded-full transition-colors"
                aria-label={t("discover.premiumAria")}
              >
                <Crown
                  className={`h-6 w-6 ${swipeLimit.isPremium ? "text-accent animate-pulse" : "text-muted-foreground hover:text-accent"}`}
                />
              </button>
              <button
                onClick={handleOpenNotifications}
                className="relative flex items-center justify-center h-9 w-9 hover:bg-muted rounded-full transition-colors"
                aria-label={t("discover.notificationsAria")}
              >
                <Bell className="h-6 w-6 text-foreground" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </Badge>
                )}
              </button>
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className="flex items-center justify-center h-9 w-9 hover:bg-muted rounded-full transition-colors"
                    aria-label={t("discover.menuAria")}
                  >
                    <Menu className="h-6 w-6 text-primary" />
                  </button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{t("discover.menu")}</SheetTitle>
                    <SheetDescription>{t("discover.navOptions")}</SheetDescription>
                  </SheetHeader>
                  <div className="py-4 space-y-1 max-h-[70vh] overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                      Discover
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => {
                        setShowDailyPicks(true);
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-primary" /> {t("discover.dailyPicks")}
                      <Badge className="ml-auto bg-primary text-white border-none text-[10px] px-1.5 py-0">
                        {dailyPicks.length}
                      </Badge>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => navigate("/ai-matchmaker")}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-primary" />{" "}
                      {t("discover.aiMatchmaker")}
                    </Button>
                    {user && (
                      <TravelMode
                        userId={user.id}
                        isPremium={swipeLimit.isPremium}
                        travelModeActive={travelModeActive}
                        travelCity={travelCity}
                        triggerClassName="w-full justify-start h-10"
                        onTravelModeChange={async () => {
                          const { data } = await supabase
                            .from("profiles")
                            .select(
                              "travel_mode_active, travel_city, travel_latitude, travel_longitude"
                            )
                            .eq("id", user.id)
                            .single();
                          if (data) {
                            setTravelModeActive(data.travel_mode_active || false);
                            setTravelCity(data.travel_city || null);
                            setTravelLatitude(data.travel_latitude || null);
                            setTravelLongitude(data.travel_longitude || null);
                          }
                          // Clear cache and refresh profiles with new location
                          if (cacheKey) {
                            localStorage.removeItem(cacheKey);
                          }
                          fetchProfiles();
                        }}
                      />
                    )}

                    <Separator className="my-2" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                      Fun & Games
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => navigate("/game-lobby")}
                    >
                      <Gamepad2 className="h-4 w-4 mr-2 text-green-500" />{" "}
                      {t("discover.datingGames")}
                    </Button>

                    <Separator className="my-2" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                      Dating Tools
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => navigate("/mood-status")}
                    >
                      <Smile className="h-4 w-4 mr-2 text-yellow-400" /> {t("discover.moodStatus")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => navigate("/ghost-alerts")}
                    >
                      <Ghost className="h-4 w-4 mr-2 text-muted-foreground" />{" "}
                      {t("discover.ghostAlerts")}
                    </Button>

                    <Separator className="my-2" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                      Account
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => navigate("/features")}
                    >
                      <Star className="h-4 w-4 mr-2 text-primary" /> Features
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => navigate("/edit-profile")}
                    >
                      <User className="h-4 w-4 mr-2" /> {t("profile.editProfile")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                      onClick={() => navigate("/settings")}
                    >
                      <Settings className="h-4 w-4 mr-2" /> {t("profile.settings")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10 text-red-500 hover:text-red-600"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4 mr-2" /> {t("auth.signOut")}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <Sheet open={showFilterSheet} onOpenChange={handleFilterSheetOpenChange}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("discover.openFiltersAria")}
                    onClick={handleOpenFilterSheet}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{t("discover.filters")}</SheetTitle>
                    <SheetDescription>{t("discover.customizeDiscovery")}</SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-6">
                    {/* Basic Filters */}
                    <div className="space-y-2">
                      <Label>{t("discover.distance")} (km)</Label>
                      <Input
                        type="number"
                        value={tempFilters.maxDistance}
                        onChange={(e) =>
                          setTempFilters((prev) => ({
                            ...prev,
                            maxDistance: parseInt(e.target.value) || 0,
                          }))
                        }
                        min={1}
                        max={500}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="smart-sort">{t("discover.smartRecommendations")}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t("discover.smartRecommendationsDesc")}
                        </p>
                      </div>
                      <Switch
                        id="smart-sort"
                        checked={tempFilters.smartSort}
                        onCheckedChange={(checked) =>
                          setTempFilters((prev) => ({
                            ...prev,
                            smartSort: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("discover.age")}</Label>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={tempFilters.minAge}
                          onChange={(e) =>
                            setTempFilters((prev) => ({
                              ...prev,
                              minAge: parseInt(e.target.value) || 18,
                            }))
                          }
                          min={18}
                          max={99}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={tempFilters.maxAge}
                          onChange={(e) =>
                            setTempFilters((prev) => ({
                              ...prev,
                              maxAge: parseInt(e.target.value) || 99,
                            }))
                          }
                          min={18}
                          max={99}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("discover.gender")}</Label>
                      <Select
                        value={tempFilters.gender}
                        onValueChange={(value) =>
                          setTempFilters((prev) => ({
                            ...prev,
                            gender: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("discover.everyonePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everyone">{t("common.everyone")}</SelectItem>
                          <SelectItem value="male">{t("common.men")}</SelectItem>
                          <SelectItem value="female">{t("common.women")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Premium Filters */}
                    {swipeLimit.isPremium && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Crown className="h-4 w-4" />
                          <span>{t("discover.premiumFilters")}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="verified-only">{t("discover.verifiedOnly")}</Label>
                          <Switch
                            id="verified-only"
                            checked={tempFilters.verifiedOnly}
                            onCheckedChange={(checked) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                verifiedOnly: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="has-image">{t("discover.hasProfileImage")}</Label>
                          <Switch
                            id="has-image"
                            checked={tempFilters.hasProfileImage}
                            onCheckedChange={(checked) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                hasProfileImage: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.sharedInterestsFilter")}</Label>
                          <Input
                            placeholder={t("discover.interestsHint")}
                            value={tempFilters.specificInterests.join(", ")}
                            onChange={(e) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                specificInterests: e.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.heightRange")}</Label>
                          <div className="flex gap-4">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={tempFilters.minHeight || ""}
                              onChange={(e) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  minHeight: parseInt(e.target.value) || 0,
                                }))
                              }
                              min={0}
                              max={250}
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                              value={tempFilters.maxHeight === 250 ? "" : tempFilters.maxHeight}
                              onChange={(e) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  maxHeight: parseInt(e.target.value) || 250,
                                }))
                              }
                              min={0}
                              max={250}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.smoking")}</Label>
                          <Select
                            value={tempFilters.smoking}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                smoking: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">{t("common.any")}</SelectItem>
                              <SelectItem value="Non-smoker">{t("discover.nonSmoker")}</SelectItem>
                              <SelectItem value="Social smoker">
                                {t("discover.socialSmoker")}
                              </SelectItem>
                              <SelectItem value="Regular smoker">
                                {t("discover.regularSmoker")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.drinking")}</Label>
                          <Select
                            value={tempFilters.drinking}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                drinking: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">{t("common.any")}</SelectItem>
                              <SelectItem value="Never">{t("discover.never")}</SelectItem>
                              <SelectItem value="Socially">{t("discover.socially")}</SelectItem>
                              <SelectItem value="Regularly">{t("discover.regularly")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.education")}</Label>
                          <Select
                            value={tempFilters.education}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                education: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">{t("common.any")}</SelectItem>
                              <SelectItem value="High School">
                                {t("discover.highSchool")}
                              </SelectItem>
                              <SelectItem value="College">{t("discover.college")}</SelectItem>
                              <SelectItem value="University">{t("discover.university")}</SelectItem>
                              <SelectItem value="Graduate">{t("discover.graduate")}</SelectItem>
                              <SelectItem value="PhD">{t("discover.phd")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.religion")}</Label>
                          <Select
                            value={tempFilters.religion}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                religion: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">{t("common.any")}</SelectItem>
                              <SelectItem value="muslim">{t("discover.muslim")}</SelectItem>
                              <SelectItem value="christian">{t("discover.christian")}</SelectItem>
                              <SelectItem value="catholic">{t("discover.catholic")}</SelectItem>
                              <SelectItem value="orthodox">{t("discover.orthodox")}</SelectItem>
                              <SelectItem value="jewish">{t("discover.jewish")}</SelectItem>
                              <SelectItem value="hindu">{t("discover.hindu")}</SelectItem>
                              <SelectItem value="buddhist">{t("discover.buddhist")}</SelectItem>
                              <SelectItem value="atheist">{t("discover.atheist")}</SelectItem>
                              <SelectItem value="agnostic">{t("discover.agnostic")}</SelectItem>
                              <SelectItem value="spiritual">{t("discover.spiritual")}</SelectItem>
                              <SelectItem value="other">{t("common.other")}</SelectItem>
                              <SelectItem value="prefer not to say">
                                {t("discover.preferNotToSay")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.lookingFor")}</Label>
                          <Select
                            value={tempFilters.lookingFor}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                lookingFor: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">{t("common.any")}</SelectItem>
                              <SelectItem value="Dating">{t("discover.dating")}</SelectItem>
                              <SelectItem value="Friends">{t("discover.friends")}</SelectItem>
                              <SelectItem value="Casual">{t("discover.casual")}</SelectItem>
                              <SelectItem value="Long-term">{t("discover.longTerm")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t("discover.zodiacSign")}</Label>
                          <Select
                            value={tempFilters.zodiacSign}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                zodiacSign: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any</SelectItem>
                              <SelectItem value="Aries">♈ Aries</SelectItem>
                              <SelectItem value="Taurus">♉ Taurus</SelectItem>
                              <SelectItem value="Gemini">♊ Gemini</SelectItem>
                              <SelectItem value="Cancer">♋ Cancer</SelectItem>
                              <SelectItem value="Leo">♌ Leo</SelectItem>
                              <SelectItem value="Virgo">♍ Virgo</SelectItem>
                              <SelectItem value="Libra">♎ Libra</SelectItem>
                              <SelectItem value="Scorpio">♏ Scorpio</SelectItem>
                              <SelectItem value="Sagittarius">♐ Sagittarius</SelectItem>
                              <SelectItem value="Capricorn">♑ Capricorn</SelectItem>
                              <SelectItem value="Aquarius">♒ Aquarius</SelectItem>
                              <SelectItem value="Pisces">♓ Pisces</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {!swipeLimit.isPremium && (
                      <Card className="p-4 bg-background border-primary/30">
                        <div className="text-center space-y-2">
                          <Crown className="h-8 w-8 text-primary mx-auto" />
                          <p className="text-sm font-semibold">
                            {t("discover.unlockPremiumFilters")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Get verified, height, lifestyle & more filters
                          </p>
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white"
                            onClick={() => setShowUpgradeDialog(true)}
                          >
                            {t("discover.upgradeNow")}
                          </Button>
                        </div>
                      </Card>
                    )}

                    {/* Save Button */}
                    <div className="pt-4 space-y-2">
                      <Button
                        onClick={handleSaveFilters}
                        className="w-full bg-primary hover:bg-primary"
                      >
                        Apply Filters
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Changes will apply after clicking "Apply Filters"
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setActiveTab("for-you")}
              className={`flex-1 px-6 py-4 min-h-[56px] rounded-2xl font-bold text-base transition-all duration-300 border-2 active:scale-95 ${
                activeTab === "for-you"
                  ? "bg-primary/20 text-primary border-primary/50 shadow-lg shadow-primary/20"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setActiveTab("last-active")}
              className={`flex-1 px-6 py-4 min-h-[56px] rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 border-2 active:scale-95 ${
                activeTab === "last-active"
                  ? "bg-primary/20 text-primary border-primary/50 shadow-lg shadow-primary/20"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
              }`}
            >
              Last Active
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - For You Tab */}

      {/* Verification nudge banner — shown to unverified users */}
      {myProfile && !myProfile.verified && (
        <div className="container mx-auto max-w-2xl px-4 mb-4">
          <div
            className="flex items-center gap-3 p-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 cursor-pointer hover:bg-blue-500/15 transition-colors"
            onClick={() => navigate("/verification")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/verification")}
          >
            <div className="shrink-0 h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-300">Get your Blue Tick ✓</p>
              <p className="text-xs text-blue-400/70">
                Verified profiles get 3× more matches. Tap to verify now.
              </p>
            </div>
            <svg
              className="h-4 w-4 text-blue-400/60 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      )}

      {activeTab === "for-you" && (
        <>
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <ProfileCardSkeleton />
            </div>
          ) : profiles.length > 0 && currentProfileIndex < profiles.length ? (
            <div className="max-w-sm mx-auto relative">
              {currentProfile ? (
                <div
                  ref={cardRef}
                  className="relative select-none touch-none cursor-grab"
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest("button, a, video, input")) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    handleSwipeStart(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (isSwiping) handleSwipeMove(e.clientX, e.clientY);
                  }}
                  onPointerUp={handleSwipeEnd}
                  onPointerCancel={handleSwipeEnd}
                >
                  <Card className="overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.3)] transition-all duration-500 border-0 rounded-3xl card-enter">
                    {/* Story ring indicator */}
                    {profileStories.length > 0 && (
                      <button
                        onClick={() => {
                          setStoryViewerIndex(0);
                          setShowStoryViewer(true);
                        }}
                        className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-primary/60 hover:bg-black/70 transition-colors"
                      >
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {t("discover.viewStory")}
                        </span>
                      </button>
                    )}
                    <div className="relative aspect-[3/4] bg-gradient-to-br from-background via-muted to-primary/20">
                      {currentProfile.profile_image_url ? (
                        <>
                          <OptimizedImage
                            src={
                              (currentProfile.profile_images &&
                                currentProfile.profile_images[cardImageIndex]) ||
                              currentProfile.profile_image_url
                            }
                            alt={currentProfile.full_name}
                            className="w-full h-full"
                            priority
                          />
                          {/* Photo progress dots */}
                          {currentProfile.profile_images &&
                            currentProfile.profile_images.length > 1 && (
                              <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                                {currentProfile.profile_images.map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`h-1 flex-1 rounded-full transition-all ${idx === cardImageIndex ? "bg-white" : "bg-white/40"}`}
                                  />
                                ))}
                              </div>
                            )}
                          {/* Tap left = prev photo, tap right = next photo */}
                          {currentProfile.profile_images &&
                            currentProfile.profile_images.length > 1 && (
                              <>
                                <div
                                  className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardImageIndex((prev) =>
                                      prev === 0
                                        ? currentProfile.profile_images!.length - 1
                                        : prev - 1
                                    );
                                  }}
                                />
                                <div
                                  className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardImageIndex((prev) =>
                                      prev === currentProfile.profile_images!.length - 1
                                        ? 0
                                        : prev + 1
                                    );
                                  }}
                                />
                              </>
                            )}
                          {/* Gradient overlay for better text readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                          {/* LIKE overlay */}
                          <div
                            ref={likeOverlayRef}
                            className="absolute top-8 left-6 z-20 border-4 border-green-500 rounded-xl px-4 py-2 rotate-[-20deg] pointer-events-none"
                          >
                            <span className="text-green-500 font-extrabold text-3xl tracking-wider">
                              LIKE
                            </span>
                          </div>
                          {/* NOPE overlay */}
                          <div
                            ref={nopeOverlayRef}
                            className="absolute top-8 right-6 z-20 border-4 border-red-500 rounded-xl px-4 py-2 rotate-[20deg] pointer-events-none"
                          >
                            <span className="text-red-500 font-extrabold text-3xl tracking-wider">
                              NOPE
                            </span>
                          </div>

                          {/* Profile info overlay on image */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <div className="flex items-end justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                    {currentProfile.full_name}
                                  </h3>
                                  <span className="text-2xl font-light opacity-90">
                                    {currentProfile.age}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mb-2">
                                  {currentProfile.verified && (
                                    <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                                      ✓ Verified
                                    </Badge>
                                  )}
                                  {currentProfile.is_premium && (
                                    <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none text-[10px] px-1.5 py-0 h-4">
                                      Premium
                                    </Badge>
                                  )}
                                  {currentProfile.video_intro_url && (
                                    <Badge className="bg-background/70 text-white border-none text-[10px] px-1.5 py-0 h-4">
                                      Video
                                    </Badge>
                                  )}
                                  {isOnline(currentProfile.last_active) && (
                                    <Badge className="bg-green-500 text-white border-none text-[10px] px-1.5 py-0 h-4">
                                      Online
                                    </Badge>
                                  )}
                                  {(() => {
                                    const score = computeMatchScore(currentProfile, myProfile);
                                    if (score >= 30)
                                      return (
                                        <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-none text-[10px] px-2 py-0 h-4 font-bold shadow-sm">
                                          ❤️ {score}% Match
                                        </Badge>
                                      );
                                    return null;
                                  })()}
                                  {currentProfile.mood_emoji && (
                                    <Badge
                                      className="bg-primary/80 text-white border-none backdrop-blur-sm text-[10px] px-1.5 py-0 h-4"
                                      title={currentProfile.mood_text || undefined}
                                    >
                                      {currentProfile.mood_emoji}{" "}
                                      {currentProfile.mood_text
                                        ? currentProfile.mood_text.slice(0, 12)
                                        : ""}
                                    </Badge>
                                  )}
                                  {currentProfile.travel_mode_active &&
                                    currentProfile.travel_city && (
                                      <Badge className="bg-blue-500/90 text-white border-none backdrop-blur-sm text-[10px] px-1.5 py-0 h-4">
                                        ✈️ Traveling
                                      </Badge>
                                    )}
                                </div>

                                {/* Location & Distance */}
                                <div className="flex items-center gap-3 text-sm font-medium">
                                  {/* Show travel city if in travel mode, otherwise regular city */}
                                  {currentProfile.travel_mode_active &&
                                  currentProfile.travel_city ? (
                                    <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                                      <span className="text-base">✈️</span>
                                      <span>
                                        {t("common.travelingIn")} {currentProfile.travel_city}
                                      </span>
                                    </div>
                                  ) : currentProfile.city ? (
                                    <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                                      <MapPin className="h-4 w-4" />
                                      <span>{currentProfile.city}</span>
                                    </div>
                                  ) : null}
                                  {currentProfile.distance_km && (
                                    <div className="backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                                      {formatDistance(currentProfile.distance_km)} away
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>

                    {/* Card content below image */}
                    <div className="p-5 bg-card/95 backdrop-blur-md space-y-4">
                      {currentProfile.bio && (
                        <p className="text-foreground text-sm leading-relaxed line-clamp-3">
                          {sanitizeText(currentProfile.bio || "")}
                        </p>
                      )}

                      {currentProfile.video_intro_url && (
                        <div className="rounded-2xl border border-primary/20 overflow-hidden">
                          <video
                            src={currentProfile.video_intro_url}
                            controls
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}

                      {currentProfile.interests.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {swipeCardInterests.map((interest) => (
                            <Badge
                              key={interest}
                              variant="secondary"
                              className="rounded-full px-3 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                            >
                              {translateInterest(interest, t)}
                            </Badge>
                          ))}
                          {currentProfile.interests.length > 5 && (
                            <Badge
                              variant="secondary"
                              className="rounded-full px-3 py-1 bg-muted text-muted-foreground"
                            >
                              +{currentProfile.interests.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Soundtrack indicator */}
                      {currentProfile.soundtrack_url && currentProfile.soundtrack_source && (
                        <div
                          className="flex items-center gap-2 p-2.5 bg-primary/10 rounded-xl cursor-pointer hover:bg-primary/15 transition-colors"
                          onClick={() => {
                            setSelectedImageIndex(0);
                            setShowProfileDialog(true);
                            if (user && currentProfile) {
                              recordProfileView(user.id, currentProfile.id);
                            }
                          }}
                        >
                          {currentProfile.soundtrack_source === "spotify" ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-500 shrink-0">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.4-1 .2-2.7-1.6-6-2-10-1.1-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 4.3-1 8.1-.6 11.1 1.2.4.3.5.7.3 1.1zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.9-7.7-2.4-11.3-1.3-.4.1-.9-.1-1.1-.6-.1-.4.1-.9.6-1.1 4.1-1.3 9.2-.7 12.7 1.5.4.2.5.8.3 1.2zm.1-3.4c-3.7-2.2-9.7-2.4-13.2-1.3-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 4-1.2 10.7-1 14.9 1.5.5.3.6.9.4 1.4-.3.4-.9.6-1.4.3z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-red-500 shrink-0">
                              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
                            </svg>
                          )}
                          <span className="text-xs font-medium text-foreground truncate">
                            🎵 {currentProfile.soundtrack_title || "Theme Song"}
                            {currentProfile.soundtrack_artist
                              ? ` — ${currentProfile.soundtrack_artist}`
                              : ""}
                          </span>
                        </div>
                      )}

                      {/* View Full Profile Button */}
                      <Button
                        variant="ghost"
                        className="w-full text-primary hover:text-primary hover:bg-primary/5 font-semibold tracking-wide uppercase text-xs py-3"
                        onClick={() => {
                          setSelectedImageIndex(0);
                          setShowProfileDialog(true);
                          // Record profile view
                          if (user && currentProfile) {
                            recordProfileView(user.id, currentProfile.id);
                          }
                        }}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        See Full Profile
                      </Button>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-border rounded-2xl dark:border-border">
                  <h3 className="text-xl font-semibold mb-2 dark:text-primary/20">
                    {t("discover.noMoreProfiles")}
                  </h3>
                  <p className="text-muted-foreground dark:text-primary/60/70 mb-4">
                    {t("discover.comeBackLater")}
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110"
                  >
                    {t("common.retry")}
                  </Button>
                </Card>
              )}

              {/* Action Buttons */}
              {currentProfile && (
                <div className="flex flex-col items-center gap-3 mt-6">
                  {/* Secondary actions row: Superlike · Roses · Instant Msg */}
                  <div className="flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1.5 shadow-sm">
                    {/* Superlike */}
                    <div className="relative">
                      <button
                        onClick={handleSuperlike}
                        disabled={isSuperliking}
                        title="Super Like"
                        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 hover:bg-primary/10 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSuperliking ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-[9px] font-semibold text-primary/70 leading-none">
                          {superlikesRemaining > 0 ? superlikesRemaining : "+"}
                        </span>
                      </button>
                    </div>

                    <div className="w-px h-5 bg-border/60" />

                    {/* Premium Roses */}
                    {!likedProfiles.has(currentProfile.id) && (
                      <button
                        onClick={() => {
                          setRosesTargetProfile(currentProfile);
                          setShowPremiumRosesDialog(true);
                        }}
                        title="Send Roses"
                        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 hover:bg-rose-500/10 group"
                      >
                        <span className="text-sm leading-none group-hover:scale-110 transition-transform inline-block">
                          🌹
                        </span>
                        <span className="text-[9px] font-semibold text-rose-400/80 leading-none">
                          Roses
                        </span>
                      </button>
                    )}

                    {!likedProfiles.has(currentProfile.id) && (
                      <div className="w-px h-5 bg-border/60" />
                    )}

                    {/* Instant Message */}
                    {!likedProfiles.has(currentProfile.id) && (
                      <button
                        onClick={() => handleInstantMessage(currentProfile)}
                        disabled={instantMessageCredits === 0}
                        title="Instant Message"
                        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 hover:bg-primary/10 disabled:opacity-60 disabled:cursor-not-allowed group"
                      >
                        <MessageSquare className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-semibold text-primary/80 leading-none">
                          {instantMessageCredits > 0 ? instantMessageCredits : "0"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Primary actions row: Rewind · Pass · Like */}
                  <div className="flex justify-center items-center gap-5">
                    {/* Rewind */}
                    <div className="relative">
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full w-12 h-12 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 shadow-md transition-all duration-200 hover:scale-110 disabled:opacity-40"
                        onClick={handleRewind}
                        disabled={lastActionHistory.length === 0 || rewindsRemaining <= 0}
                        title="Undo last action"
                      >
                        <RotateCcw className="h-5 w-5 text-primary" />
                      </Button>
                      {rewindsRemaining > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold border border-card shadow">
                          {rewindsRemaining}
                        </span>
                      )}
                    </div>

                    {/* Pass */}
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full w-16 h-16 border-2 border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/40 shadow-md transition-all duration-200 active:scale-90 hover:scale-110"
                      onClick={() => handlePass(currentProfile.id)}
                    >
                      <X className="h-7 w-7 text-muted-foreground" />
                    </Button>

                    {/* Like */}
                    <Button
                      size="icon"
                      className="rounded-full w-16 h-16 bg-gradient-to-br from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 shadow-md transition-all duration-200 active:scale-90 hover:scale-110"
                      onClick={() => handleLike(currentProfile.id)}
                    >
                      <Heart className="h-7 w-7 text-white" />
                    </Button>
                  </div>
                </div>
              )}
              {currentProfile && showSwipeHint && (
                <div className="absolute inset-x-0 top-0 bottom-28 z-50 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/70 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="flex items-center gap-1.5 text-green-400">
                      <span className="text-xs font-semibold text-white/70">swipe up</span>
                      <Heart className="h-4 w-4" />
                      <span className="text-sm font-bold text-white">Like</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5 text-red-400">
                        <X className="h-4 w-4" />
                        <span className="text-sm font-bold text-white">Pass</span>
                        <span className="text-xs font-semibold text-white/70">←</span>
                      </div>
                      <div className="w-px h-6 bg-white/20" />
                      <div className="flex items-center gap-1.5 text-green-400">
                        <span className="text-xs font-semibold text-white/70">→</span>
                        <span className="text-sm font-bold text-white">Like</span>
                        <Heart className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-400">
                      <span className="text-sm font-bold text-white">Pass</span>
                      <X className="h-4 w-4" />
                      <span className="text-xs font-semibold text-white/70">swipe down</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center h-96 text-muted-foreground">
              <p>{t("discover.noMoreProfiles")}</p>
            </div>
          )}
        </>
      )}

      {/* Main Content - Last Active Tab */}
      {activeTab === "last-active" && (
        <div className="max-w-6xl mx-auto px-4">
          {spotlightProfiles.length > 0 ? (
            <ScrollArea className="w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                {spotlightProfiles.map((profile, index) => (
                  <ProfileGridCard
                    key={profile.id}
                    profile={profile}
                    priority={index === 0}
                    onClick={() => {
                      setLastActiveProfile(profile);
                      setLastActiveImageIndex(0);
                      setShowLastActiveProfile(true);
                      if (user) recordProfileView(user.id, profile.id);
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("discover.noActiveBoosters")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("discover.noBoosterDesc")}</p>
            </div>
          )}
        </div>
      )}

      {/* Boost Status Dialog (when active) */}
      <Dialog open={showBoostStatusDialog} onOpenChange={setShowBoostStatusDialog}>
        <DialogContent className="max-w-md border border-border" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-primary">
              <Zap
                className="h-6 w-6 text-primary dark:text-primary animate-zap-shine"
                fill="currentColor"
              />
              Spotlight Boost Active
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-background  p-6 rounded-lg border-2 border-border dark:border-border">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <Zap
                    className="h-16 w-16 text-primary dark:text-primary animate-pulse"
                    fill="currentColor"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-primary mb-2">
                    Time Remaining
                  </p>
                  <p className="text-4xl font-bold text-primary dark:text-primary">
                    {boosterTimeRemaining}
                  </p>
                </div>
                {boosterExpiresAt && (
                  <p className="text-xs text-muted-foreground dark:text-red-300/60">
                    Expires at{" "}
                    {new Date(boosterExpiresAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-green-50 dark:bg-red-950/30 border border-green-200 dark:border-red-800 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-red-400 mt-0.5" />
                <div className="text-sm text-green-800 dark:text-red-200">
                  <p className="font-semibold mb-1">{t("discover.profileBoosted")}</p>
                  <p>
                    You're being shown to more people in your area and appearing higher in their
                    discovery feed.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowBoostStatusDialog(false)}
              className="w-full dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-100"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Boost Purchase Dialog */}
      <Dialog open={showBoostDialog} onOpenChange={setShowBoostDialog}>
        <DialogContent className="max-w-md border border-border" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-primary">
              <Zap className="h-6 w-6 text-primary dark:text-primary" fill="currentColor" />
              Activate Spotlight Boost
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-muted-foreground">
              Get more visibility! Your profile will be shown to more people in your area. Use coins
              to activate a boost.
            </p>

            <div className="space-y-3">
              {/* Free Boost Option (if user has credits) */}
              {boostCredits > 0 && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = (await supabase.rpc(
                          "activate_booster_with_credit",
                          {
                            user_id: user?.id,
                            hours: 3,
                          }
                        )) as {
                          data: {
                            success: boolean;
                            credits_remaining?: number;
                            error?: string;
                          } | null;
                          error: unknown;
                        };

                        if (error) throw error;

                        if (data?.success) {
                          toast.success(t("discover.boost3hFree"));
                          setBoostCredits(data.credits_remaining || 0);
                          setShowBoostDialog(false);
                          await fetchMyProfile();
                        } else {
                          toast.error(data?.error || "Failed to activate boost");
                        }
                      } catch (error) {
                        logger.error("Error activating boost:", error);
                        toast.error(t("discover.failedBoost"));
                      }
                    }}
                    className="w-full p-4 border-2 border-primary bg-primary/10 rounded-lg hover:border-primary hover:bg-primary/10 transition-all text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          3 Hours
                          <Badge className="bg-primary">{t("common.freeBadge")}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Use 1 of your {boostCredits} free boosts
                        </div>
                      </div>
                      <Crown className="h-8 w-8 text-primary" />
                    </div>
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t("discover.orBuyMore")}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* 3 Hours Option */}
              <button
                onClick={async () => {
                  const cost = 5;
                  if (!user?.id) {
                    toast.error(t("discover.signInToBoost"));
                    return;
                  }
                  if (walletBalance < cost) {
                    toast.error(t("discover.notEnoughCoins"));
                    return;
                  }
                  try {
                    const { error } = await supabase.rpc("activate_booster", {
                      user_id: user.id,
                      hours: 3,
                    });
                    if (error) throw error;
                    // Fetch fresh balance to avoid stale-state race
                    const { data: freshWallet } = await supabase
                      .from("wallets")
                      .select("balance")
                      .eq("user_id", user.id)
                      .single();
                    const freshBalance =
                      (freshWallet as { balance: number } | null)?.balance ?? walletBalance;
                    const { error: walletError } = await supabase
                      .from("wallets")
                      .update({
                        balance: Math.max(freshBalance - cost, 0),
                        updated_at: new Date().toISOString(),
                      })
                      .eq("user_id", user.id);
                    if (walletError) throw walletError;
                    const { error: txError } = await supabase
                      .from("wallet_transactions")
                      .insert({ user_id: user.id, amount: -cost, type: "spend", item: "boost_3h" });
                    if (txError) throw txError;
                    setWalletBalance(Math.max(freshBalance - cost, 0));
                    toast.success(t("discover.boost3h"));
                    setShowBoostDialog(false);
                    await fetchMyProfile();
                  } catch (error) {
                    logger.error("Error activating boost:", error);
                    toast.error(t("discover.failedBoost"));
                  }
                }}
                className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={walletBalance < 5}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg">3 Hours</div>
                    <div className="text-sm text-muted-foreground">{t("discover.quickBoost")}</div>
                  </div>
                  <div className="text-2xl font-bold text-primary">5 coins</div>
                </div>
              </button>

              {/* 6 Hours Option */}
              <button
                onClick={async () => {
                  const cost = 9;
                  if (!user?.id) {
                    toast.error(t("discover.signInToBoost"));
                    return;
                  }
                  if (walletBalance < cost) {
                    toast.error(t("discover.notEnoughCoins"));
                    return;
                  }
                  try {
                    const { error } = await supabase.rpc("activate_booster", {
                      user_id: user.id,
                      hours: 6,
                    });
                    if (error) throw error;
                    // Fetch fresh balance to avoid stale-state race
                    const { data: freshWallet } = await supabase
                      .from("wallets")
                      .select("balance")
                      .eq("user_id", user.id)
                      .single();
                    const freshBalance =
                      (freshWallet as { balance: number } | null)?.balance ?? walletBalance;
                    const { error: walletError } = await supabase
                      .from("wallets")
                      .update({
                        balance: Math.max(freshBalance - cost, 0),
                        updated_at: new Date().toISOString(),
                      })
                      .eq("user_id", user.id);
                    if (walletError) throw walletError;
                    const { error: txError } = await supabase
                      .from("wallet_transactions")
                      .insert({ user_id: user.id, amount: -cost, type: "spend", item: "boost_6h" });
                    if (txError) throw txError;
                    setWalletBalance(Math.max(freshBalance - cost, 0));
                    toast.success(t("discover.boost6h"));
                    setShowBoostDialog(false);
                    await fetchMyProfile();
                  } catch (error) {
                    logger.error("Error activating boost:", error);
                    toast.error(t("discover.failedBoost"));
                  }
                }}
                className="w-full p-4 border-2 border-primary bg-primary/10 rounded-lg hover:border-primary hover:bg-primary/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={walletBalance < 9}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg">6 Hours</div>
                    <div className="text-sm text-muted-foreground">{t("discover.mostPopular")}</div>
                  </div>
                  <div className="text-2xl font-bold text-primary">9 coins</div>
                </div>
              </button>

              {/* 10 Hours Option */}
              <button
                onClick={async () => {
                  const cost = 13;
                  if (!user?.id) {
                    toast.error(t("discover.signInToBoost"));
                    return;
                  }
                  if (walletBalance < cost) {
                    toast.error(t("discover.notEnoughCoins"));
                    return;
                  }
                  try {
                    const { error } = await supabase.rpc("activate_booster", {
                      user_id: user.id,
                      hours: 10,
                    });
                    if (error) throw error;
                    // Fetch fresh balance to avoid stale-state race
                    const { data: freshWallet } = await supabase
                      .from("wallets")
                      .select("balance")
                      .eq("user_id", user.id)
                      .single();
                    const freshBalance =
                      (freshWallet as { balance: number } | null)?.balance ?? walletBalance;
                    const { error: walletError } = await supabase
                      .from("wallets")
                      .update({
                        balance: Math.max(freshBalance - cost, 0),
                        updated_at: new Date().toISOString(),
                      })
                      .eq("user_id", user.id);
                    if (walletError) throw walletError;
                    const { error: txError } = await supabase.from("wallet_transactions").insert({
                      user_id: user.id,
                      amount: -cost,
                      type: "spend",
                      item: "boost_10h",
                    });
                    if (txError) throw txError;
                    setWalletBalance(Math.max(freshBalance - cost, 0));
                    toast.success(t("discover.boost10h"));
                    setShowBoostDialog(false);
                    await fetchMyProfile();
                  } catch (error) {
                    logger.error("Error activating boost:", error);
                    toast.error(t("discover.failedBoost"));
                  }
                }}
                className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={walletBalance < 13}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg">10 Hours</div>
                    <div className="text-sm text-muted-foreground">
                      {t("discover.bestValueBadge")}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">13 coins</div>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Roses VIP Dialog */}
      <Dialog open={showPremiumRosesDialog} onOpenChange={setShowPremiumRosesDialog}>
        <DialogContent
          className="sm:max-w-lg bg-gradient-to-br from-background via-muted to-primary/10  border-4 border-primary/30 "
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-[hsl(350,98%,62%)] via-[hsl(5,98%,62%)] to-[hsl(15,100%,60%)] bg-clip-text text-transparent flex items-center justify-center gap-3">
              <Flower2 className="h-8 w-8 text-primary animate-bounce" />
              Premium Roses
              <Crown className="h-8 w-8 text-primary animate-pulse" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {rosesTargetProfile && (
              <div className="relative">
                {/* Rose Animation Background */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Flower2 className="h-32 w-32 text-primary animate-spin-slow" />
                </div>

                <div className="relative flex flex-col items-center gap-4 p-6 bg-card/80 dark:bg-primary/10/80 rounded-xl border-2 border-border /30 backdrop-blur-sm">
                  <img
                    src={rosesTargetProfile.profile_image_url || "/placeholder.svg"}
                    alt={rosesTargetProfile.full_name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-xl"
                  />
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-foreground dark:text-primary/20">
                      {rosesTargetProfile.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground dark:text-primary/60">
                      Age {rosesTargetProfile.age}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-muted to-muted  p-6 rounded-xl border-2 border-border /30">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Flower2 className="h-6 w-6 text-primary dark:text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-lg text-primary dark:text-primary mb-2">
                      💐 VIP Premium Roses Experience
                    </h4>
                    <ul className="space-y-2 text-sm text-foreground dark:text-primary/30">
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>
                          <strong>{t("discover.instantMatch")}</strong>{" "}
                          {t("discover.instantMatchDesc")}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>
                          <strong>{t("discover.automaticLikeBack")}</strong>{" "}
                          {t("discover.automaticLikeBackDesc")}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>
                          <strong>{t("discover.exclusiveRoseTheme")}</strong>{" "}
                          {t("discover.exclusiveRoseThemeDesc")}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>
                          <strong>{t("discover.vipStatus")}</strong> {t("discover.vipStatusDesc")}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 border-t-2 border-border dark:border-primary">
                  <Crown className="h-6 w-6 text-primary animate-pulse" />
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary dark:text-primary/60">
                      1 Coin
                    </span>
                    <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full mt-1">
                      Wallet balance: {walletBalance}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground dark:text-primary/80">
                    {t("discover.perRose")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPremiumRosesDialog(false)}
                className="flex-1 border-2 border-border dark:border-primary hover:bg-muted dark:hover:bg-primary/50"
              >
                {t("common.cancel")}
              </Button>
              <Button
                disabled={walletBalance < 1}
                onClick={handlePremiumRoses}
                className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] via-[hsl(5,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white font-bold text-lg shadow-xl border-2 border-primary/30 "
              >
                <Flower2 className="h-5 w-5 mr-2 animate-bounce" />
                Send Roses 💐
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-2 border-border"
                onClick={() => navigate("/wallet")}
              >
                <Coins className="h-5 w-5 mr-2" />
                Buy Coins
              </Button>
            </div>

            <p className="text-xs text-center text-primary dark:text-primary/80 font-semibold bg-primary/10 dark:bg-primary/30 py-2 rounded">
              🧪 TEST MODE: No payment required - Testing Premium Roses feature
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instant Message Dialog */}
      <Dialog open={showInstantMessageDialog} onOpenChange={setShowInstantMessageDialog}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Instant Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {instantMessageTargetProfile && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/10 to-primary/10 rounded-lg">
                <img
                  src={instantMessageTargetProfile.profile_image_url || "/placeholder.svg"}
                  alt={instantMessageTargetProfile.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold">{instantMessageTargetProfile.full_name}</div>
                  <div className="text-sm text-muted-foreground">{t("discover.sendMsgFirst")}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="instant-message-text">{t("discover.yourMessage")}</Label>
              <Textarea
                id="instant-message-text"
                placeholder={t("discover.writeSomethingPlaceholder")}
                value={instantMessageText}
                onChange={(e) => setInstantMessageText(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {instantMessageText.length}/500 characters
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{t("discover.creditsRemaining")}</span>
              </div>
              <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white">
                {instantMessageCredits}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInstantMessageDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={sendInstantMessage}
                disabled={!instantMessageText.trim() || instantMessageCredits === 0}
                className="flex-1 bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground border-t pt-3">
              💡 Tip: Write something personalized to increase your chances of a response!
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {swipeLimit.isPremium ? "Premium Active" : "Upgrade to Premium"}
            </DialogTitle>
          </DialogHeader>
          {swipeLimit.isPremium ? (
            <div className="py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Crown className="h-8 w-8 text-accent-foreground" />
                </div>
                <h4 className="text-lg font-semibold">{t("discover.alreadyPremium")}</h4>
                <p className="text-muted-foreground">
                  You have access to all premium features including unlimited swipes, advanced
                  filters, and the ability to see who liked you.
                </p>
                <ul className="space-y-2 text-left w-full">
                  <li className="flex items-center gap-2 text-primary">
                    <Heart className="h-5 w-5" />
                    Unlimited Swipes ✓
                  </li>
                  <li className="flex items-center gap-2 text-primary">
                    <MessageCircle className="h-5 w-5" />
                    See who liked you ✓
                  </li>
                  <li className="flex items-center gap-2 text-primary">
                    <Settings className="h-5 w-5" />
                    Advanced filters ✓
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-6">
              <h4 className="text-lg font-semibold mb-4">{t("discover.premiumBenefits")}</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Unlimited Swipes
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  See who liked you
                </li>
                <li className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Advanced filters
                </li>
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              {swipeLimit.isPremium ? "Close" : "Later"}
            </Button>
            {!swipeLimit.isPremium && (
              <Button onClick={handleUpgrade}>{t("discover.upgradeNow")}</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          {currentProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {currentProfile.full_name}, {currentProfile.age}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.verified && (
                    <Badge className="bg-primary text-white border-none">
                      {t("common.verified")}
                    </Badge>
                  )}
                  {currentProfile.is_premium && (
                    <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
                      Premium
                    </Badge>
                  )}
                  {currentProfile.video_intro_url && (
                    <Badge className="bg-background/80 text-white border-none">
                      {t("common.videoIntroLabel")}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Image Carousel */}
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                  {currentProfile.profile_images && currentProfile.profile_images.length > 0 ? (
                    <>
                      <img
                        src={
                          currentProfile.profile_images[selectedImageIndex] ||
                          currentProfile.profile_image_url ||
                          "/placeholder.svg"
                        }
                        alt={`${currentProfile.full_name} - Photo ${selectedImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {currentProfile.profile_images.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                            onClick={() =>
                              setSelectedImageIndex((prev) =>
                                prev === 0 ? currentProfile.profile_images!.length - 1 : prev - 1
                              )
                            }
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                            onClick={() =>
                              setSelectedImageIndex((prev) =>
                                prev === currentProfile.profile_images!.length - 1 ? 0 : prev + 1
                              )
                            }
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {currentProfile.profile_images.map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${
                                  idx === selectedImageIndex ? "bg-card" : "bg-card/50"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <img
                      src={currentProfile.profile_image_url || "/placeholder.svg"}
                      alt={currentProfile.full_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {currentProfile.video_intro_url && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {t("common.videoIntro")}
                    </h4>
                    <div className="rounded-lg overflow-hidden border border-primary/20">
                      <video
                        src={currentProfile.video_intro_url}
                        controls
                        className="w-full max-h-[420px] object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Location */}
                {currentProfile.travel_mode_active && currentProfile.travel_city ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-lg">✈️</span>
                    <span className="font-medium">
                      {t("common.travelingIn")} {currentProfile.travel_city}
                    </span>
                    {currentProfile.distance_km && (
                      <span className="text-muted-foreground">
                        • {formatDistance(currentProfile.distance_km)} away
                      </span>
                    )}
                  </div>
                ) : currentProfile.city ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="font-medium">{currentProfile.city}</span>
                    {currentProfile.distance_km && (
                      <span className="text-muted-foreground">
                        • {formatDistance(currentProfile.distance_km)} away
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Profile Details Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {currentProfile.work && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">💼</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Work
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate">
                          {currentProfile.work}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentProfile.education && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">🎓</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Education
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate">
                          {currentProfile.education}
                        </p>
                      </div>
                    </div>
                  )}
                  {(currentProfile.height_cm || currentProfile.height) && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">📏</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Height
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate">
                          {currentProfile.height_cm
                            ? `${currentProfile.height_cm} cm`
                            : currentProfile.height}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentProfile.zodiac_sign && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">♈</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Zodiac
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate capitalize">
                          {currentProfile.zodiac_sign}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentProfile.religion && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">🙏</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Religion
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate capitalize">
                          {currentProfile.religion}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentProfile.lifestyle && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">🌟</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Lifestyle
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate capitalize">
                          {currentProfile.lifestyle}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentProfile.drinking && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">🍷</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Drinking
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate capitalize">
                          {currentProfile.drinking}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentProfile.smoking && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">🚬</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Smoking
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate capitalize">
                          {currentProfile.smoking}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentProfile.pets && (
                    <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/40">
                      <span className="text-base">🐾</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">
                          Pets
                        </p>
                        <p className="font-semibold text-xs text-foreground truncate capitalize">
                          {currentProfile.pets}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bio */}
                {currentProfile.bio && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                      <span className="text-base">💬</span> About
                    </h3>
                    <p className="text-foreground text-sm leading-relaxed bg-muted/30 border border-border/40 p-3 rounded-xl">
                      {sanitizeText(currentProfile.bio || "")}
                    </p>
                  </div>
                )}

                {currentProfile.interests &&
                  currentProfile.interests.length > 0 &&
                  myProfile?.interests &&
                  myProfile.interests.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                        <span className="text-base">✨</span> Shared Interests
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {currentProfile.interests
                          .filter((interest) =>
                            myProfile.interests.some(
                              (mine) => mine.toLowerCase() === interest.toLowerCase()
                            )
                          )
                          .slice(0, 3)
                          .map((interest) => (
                            <span
                              key={interest}
                              className="inline-flex items-center gap-1 text-xs font-medium bg-primary/15 text-primary border border-primary/25 rounded-full px-2.5 py-1"
                            >
                              {translateInterest(interest, t)}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Looking For */}
                {currentProfile.looking_for && currentProfile.looking_for.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                      <span className="text-base">💕</span> Looking For
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.looking_for.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white rounded-full px-3 py-1"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {currentProfile.interests && currentProfile.interests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                      <span className="text-base">✨</span> Interests
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs font-medium bg-muted/60 text-foreground border border-border/50 rounded-full px-2.5 py-1 hover:bg-muted transition-colors"
                        >
                          {translateInterest(interest, t)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Soundtrack */}
                {currentProfile.soundtrack_url &&
                  currentProfile.soundtrack_source &&
                  (() => {
                    const ytId =
                      currentProfile.soundtrack_source === "youtube"
                        ? extractYouTubeId(currentProfile.soundtrack_url!)
                        : null;
                    const spId =
                      currentProfile.soundtrack_source === "spotify"
                        ? extractSpotifyTrackId(currentProfile.soundtrack_url!)
                        : null;
                    if (!ytId && !spId) return null;
                    return (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">🎵</span> Soundtrack
                        </h3>
                        {(currentProfile.soundtrack_title || currentProfile.soundtrack_artist) && (
                          <p className="text-sm text-muted-foreground">
                            {currentProfile.soundtrack_title}
                            {currentProfile.soundtrack_artist
                              ? ` — ${currentProfile.soundtrack_artist}`
                              : ""}
                          </p>
                        )}
                        {ytId && (
                          <div className="rounded-xl overflow-hidden aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${ytId}`}
                              title="Profile soundtrack"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}
                        {spId && (
                          <div className="rounded-xl overflow-hidden">
                            <iframe
                              src={`https://open.spotify.com/embed/track/${spId}?theme=0`}
                              title="Profile soundtrack"
                              className="w-full"
                              height="152"
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowProfileDialog(false);
                      handlePass(currentProfile.id);
                    }}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Pass
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110"
                    onClick={() => {
                      setShowProfileDialog(false);
                      handleLike(currentProfile.id);
                    }}
                  >
                    <Heart className="h-5 w-5 mr-2" />
                    Like
                  </Button>
                </div>
                {!likedProfiles.has(currentProfile.id) && (
                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      className="flex-1 bg-gradient-to-br from-[hsl(350,80%,55%)] via-[hsl(5,90%,55%)] to-[hsl(15,90%,50%)] hover:brightness-110 text-white border-2 border-yellow-400"
                      onClick={() => {
                        setRosesTargetProfile(currentProfile);
                        setShowProfileDialog(false);
                        setShowPremiumRosesDialog(true);
                      }}
                    >
                      <span className="text-xl mr-2">🌹</span>
                      Send Roses
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 bg-gradient-to-br from-[hsl(350,98%,62%)] via-[hsl(5,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white border-2 border-border"
                      onClick={() => {
                        setShowProfileDialog(false);
                        handleInstantMessage(currentProfile);
                      }}
                      disabled={instantMessageCredits === 0}
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Instant Chat {instantMessageCredits > 0 && `(${instantMessageCredits})`}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Superlike Purchase Dialog */}
      <Dialog open={showSuperlikeDialog} onOpenChange={setShowSuperlikeDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Get Superlikes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Stand out from the crowd! Superlikes give you 3x more chances to match.
            </p>

            {/* Premium Upsell — only show if not already premium */}
            {swipeLimit.isPremium ? (
              <div className="bg-gradient-to-r from-primary/10 to-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">{t("discover.premiumMember")}</h3>
                    <p className="text-sm text-muted-foreground">
                      You receive 5 free Superlikes every month. Top up any time below.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-primary/10 to-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{t("discover.premiumBenefit")}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Premium members get 5 free Superlikes every month!
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-3 border-primary/50 hover:bg-primary/10"
                  onClick={() => {
                    setShowSuperlikeDialog(false);
                    navigate("/premium");
                  }}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </div>
            )}

            {/* Purchase Options */}
            <div className="space-y-3">
              <h3 className="font-semibold">
                {swipeLimit.isPremium ? "Buy More Superlikes" : "Or Buy Superlikes"}
              </h3>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4"
                disabled={superlikeCheckoutLoading !== null}
                onClick={() => handlePurchaseSuperlikes(1)}
              >
                <div className="flex items-center gap-2">
                  {superlikeCheckoutLoading === 1 ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-primary" />
                  )}
                  <span className="font-semibold">
                    {superlikeCheckoutLoading === 1 ? "Opening checkout…" : "1 Super Like"}
                  </span>
                </div>
                <span className="text-lg font-bold">€3.00</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4 border-primary/30 relative"
                disabled={superlikeCheckoutLoading !== null}
                onClick={() => handlePurchaseSuperlikes(5)}
              >
                <Badge className="absolute -top-2 -right-2 bg-primary">
                  {t("discover.save20")}
                </Badge>
                <div className="flex items-center gap-2">
                  {superlikeCheckoutLoading === 5 ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-primary" />
                  )}
                  <span className="font-semibold">
                    {superlikeCheckoutLoading === 5 ? "Opening checkout…" : "5 Super Likes"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">€12.00</div>
                  <div className="text-xs text-muted-foreground line-through">€15.00</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4 border-primary/30 relative"
                disabled={superlikeCheckoutLoading !== null}
                onClick={() => handlePurchaseSuperlikes(10)}
              >
                <Badge className="absolute -top-2 -right-2 bg-primary">
                  {t("discover.bestValueLabel")}
                </Badge>
                <div className="flex items-center gap-2">
                  {superlikeCheckoutLoading === 10 ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-primary" />
                  )}
                  <span className="font-semibold">
                    {superlikeCheckoutLoading === 10 ? "Opening checkout…" : "10 Super Likes"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">€20.00</div>
                  <div className="text-xs text-muted-foreground line-through">€30.00</div>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Animation - Only render when needed */}
      {showMatchAnimation && (
        <MatchAnimation
          show={showMatchAnimation}
          matchName={matchedProfile?.full_name || "Someone"}
          onComplete={() => {
            setShowMatchAnimation(false);
            setIsPremiumRosesMatch(false);
            setMatchedMatchId(null);
          }}
          onChatNow={
            matchedMatchId
              ? (opener?: string) => {
                  setShowMatchAnimation(false);
                  setIsPremiumRosesMatch(false);
                  navigate(`/chat/${matchedMatchId}`, { state: { opener } });
                  setMatchedMatchId(null);
                }
              : undefined
          }
          isPremiumRoses={isPremiumRosesMatch}
          sharedInterests={
            matchedProfile && myProfile
              ? (matchedProfile.interests || []).filter((i) =>
                  (myProfile.interests || []).map((x) => x.toLowerCase()).includes(i.toLowerCase())
                )
              : []
          }
        />
      )}

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent
          className="max-w-md max-h-[80vh] overflow-hidden flex flex-col"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{t("common.notifications")}</DialogTitle>
          </DialogHeader>
          <div className="flex border-b">
            <button
              onClick={() => setNotificationTab("views")}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                notificationTab === "views"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" />
                <span>
                  {t("discover.profileViews")} ({profileViews.length})
                </span>
              </div>
            </button>
            <button
              onClick={() => setNotificationTab("likes")}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                notificationTab === "likes"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Heart className="h-4 w-4" />
                <span>
                  {t("discover.likes")} ({profileLikes.length})
                </span>
              </div>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            {notificationTab === "views" ? (
              profileViews.length > 0 ? (
                <div className="space-y-3">
                  {profileViews.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 p-3 hover:bg-background dark:hover:bg-primary/10 rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        setNotificationProfile(profile);
                        setShowNotificationProfileDialog(true);
                      }}
                    >
                      <Avatar className="h-12 w-12 border-2 border-border">
                        <AvatarImage
                          src={profile.profile_image_url || ""}
                          alt={profile.full_name}
                        />
                        <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                          {profile.verified && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.age} • {profile.location || "Location hidden"}
                        </p>
                        {profile.timestamp && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTimeAgo(profile.timestamp)}
                          </p>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium">
                    {t("discover.noProfileViews")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    People who view your profile will appear here
                  </p>
                </div>
              )
            ) : profileLikes.length > 0 ? (
              <div className="space-y-3">
                {profileLikes.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 hover:bg-background dark:hover:bg-primary/10 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      setNotificationProfile(profile);
                      setShowNotificationProfileDialog(true);
                    }}
                  >
                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarImage src={profile.profile_image_url || ""} alt={profile.full_name} />
                      <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                        {profile.verified && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            ✓
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile.age} • {profile.location || "Location hidden"}
                      </p>
                      {profile.timestamp && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTimeAgo(profile.timestamp)}
                        </p>
                      )}
                    </div>
                    <Heart className="h-5 w-5 text-primary fill-primary" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t("discover.noLikesYet")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Profile Dialog - Show full profile matching Discover style */}
      <Dialog
        open={showNotificationProfileDialog}
        onOpenChange={(open) => {
          setShowNotificationProfileDialog(open);
          if (!open) {
            setNotificationProfileImageIndex(0);
            setShowNotificationFullProfile(false);
          }
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          {notificationProfile &&
            (() => {
              const allImages = [
                notificationProfile.profile_image_url,
                ...(notificationProfile.profile_images || []),
              ].filter(Boolean) as string[];
              const p = notificationProfile;

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                      {p.full_name}, {p.age}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-2">
                      {p.verified && (
                        <Badge className="bg-primary text-white border-none">
                          {t("common.verified")}
                        </Badge>
                      )}
                      {p.is_premium && (
                        <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
                          Premium
                        </Badge>
                      )}
                      {p.video_intro_url && (
                        <Badge className="bg-background/80 text-white border-none">
                          Video Intro
                        </Badge>
                      )}
                    </div>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Image Carousel */}
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                      {allImages.length > 0 ? (
                        <>
                          <img
                            src={allImages[notificationProfileImageIndex]}
                            alt={`${p.full_name} - Photo ${notificationProfileImageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {allImages.length > 1 && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                                onClick={() =>
                                  setNotificationProfileImageIndex((prev) =>
                                    prev === 0 ? allImages.length - 1 : prev - 1
                                  )
                                }
                              >
                                <ChevronLeft className="h-6 w-6" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                                onClick={() =>
                                  setNotificationProfileImageIndex((prev) =>
                                    prev === allImages.length - 1 ? 0 : prev + 1
                                  )
                                }
                              >
                                <ChevronRight className="h-6 w-6" />
                              </Button>
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {allImages.map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full ${idx === notificationProfileImageIndex ? "bg-card" : "bg-card/50"}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>

                    {/* Video Intro */}
                    {p.video_intro_url && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {t("common.videoIntro")}
                        </h4>
                        <div className="rounded-lg overflow-hidden border border-primary/20">
                          <video
                            src={p.video_intro_url}
                            controls
                            className="w-full max-h-[420px] object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    {p.travel_mode_active && p.travel_city ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="text-lg">✈️</span>
                        <span className="font-medium">
                          {t("common.travelingIn")} {p.travel_city}
                        </span>
                        {p.distance_km && (
                          <span className="text-muted-foreground">
                            • {formatDistance(p.distance_km)} away
                          </span>
                        )}
                      </div>
                    ) : p.city ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="font-medium">{p.city}</span>
                        {p.distance_km && (
                          <span className="text-muted-foreground">
                            • {formatDistance(p.distance_km)} away
                          </span>
                        )}
                      </div>
                    ) : null}

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {p.work && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                          <p className="font-semibold text-sm text-foreground">{p.work}</p>
                        </Card>
                      )}
                      {p.education && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                          <p className="font-semibold text-sm text-foreground">{p.education}</p>
                        </Card>
                      )}
                      {(p.height_cm || p.height) && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                          <p className="font-semibold text-sm text-foreground">
                            {p.height_cm ? `${p.height_cm} cm` : p.height}
                          </p>
                        </Card>
                      )}
                      {p.zodiac_sign && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                          <p className="font-semibold text-sm text-foreground">{p.zodiac_sign}</p>
                        </Card>
                      )}
                      {p.religion && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                          <p className="font-semibold text-sm text-foreground">{p.religion}</p>
                        </Card>
                      )}
                      {p.lifestyle && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                          <p className="font-semibold text-sm text-foreground">{p.lifestyle}</p>
                        </Card>
                      )}
                      {p.drinking && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                          <p className="font-semibold text-sm text-foreground">{p.drinking}</p>
                        </Card>
                      )}
                      {p.smoking && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                          <p className="font-semibold text-sm text-foreground">{p.smoking}</p>
                        </Card>
                      )}
                      {p.pets && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                          <p className="font-semibold text-sm text-foreground">{p.pets}</p>
                        </Card>
                      )}
                    </div>

                    {/* Bio */}
                    {p.bio && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">💬</span> About
                        </h3>
                        <p className="text-foreground leading-relaxed bg-background p-4 rounded-lg">
                          {p.bio}
                        </p>
                      </div>
                    )}

                    {/* Shared Interests */}
                    {p.interests &&
                      p.interests.length > 0 &&
                      myProfile?.interests &&
                      myProfile.interests.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span className="text-2xl">✨</span> Shared Interests
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {p.interests
                              .filter((interest) =>
                                myProfile.interests.some(
                                  (mine) => mine.toLowerCase() === interest.toLowerCase()
                                )
                              )
                              .slice(0, 3)
                              .map((interest) => (
                                <Badge key={interest} variant="secondary" className="rounded-full">
                                  {interest}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Looking For */}
                    {p.looking_for && p.looking_for.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">💕</span> Looking For
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {p.looking_for.map((item, idx) => (
                            <Badge
                              key={idx}
                              className="text-sm py-1.5 px-4 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 border-none"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interests */}
                    {p.interests && p.interests.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">✨</span> Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {p.interests.map((interest, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-sm py-1.5 px-4 rounded-full bg-primary/10 text-primary border-border"
                            >
                              {translateInterest(interest, t)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Soundtrack */}
                    {p.soundtrack_url &&
                      p.soundtrack_source &&
                      (() => {
                        const ytId =
                          p.soundtrack_source === "youtube"
                            ? extractYouTubeId(p.soundtrack_url!)
                            : null;
                        const spId =
                          p.soundtrack_source === "spotify"
                            ? extractSpotifyTrackId(p.soundtrack_url!)
                            : null;
                        if (!ytId && !spId) return null;
                        return (
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <span className="text-2xl">🎵</span> Soundtrack
                            </h3>
                            {(p.soundtrack_title || p.soundtrack_artist) && (
                              <p className="text-sm text-muted-foreground">
                                {p.soundtrack_title}
                                {p.soundtrack_artist ? ` — ${p.soundtrack_artist}` : ""}
                              </p>
                            )}
                            {ytId && (
                              <div className="rounded-xl overflow-hidden aspect-video">
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  title="Profile soundtrack"
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                            {spId && (
                              <div className="rounded-xl overflow-hidden">
                                <iframe
                                  src={`https://open.spotify.com/embed/track/${spId}?theme=0`}
                                  title="Profile soundtrack"
                                  className="w-full"
                                  height="152"
                                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* Action Buttons */}
                    {!likedProfiles.has(p.id) && (
                      <div className="flex gap-3 pt-4">
                        <Button
                          size="lg"
                          className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white"
                          onClick={() => {
                            setInstantMessageTargetProfile(p);
                            setShowNotificationProfileDialog(false);
                            setShowInstantMessageDialog(true);
                          }}
                        >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          Instant Message
                        </Button>
                        <Button
                          size="lg"
                          className="bg-gradient-to-br from-[hsl(350,80%,55%)] via-[hsl(5,90%,55%)] to-[hsl(15,90%,50%)] hover:brightness-110 text-white border-2 border-primary/30"
                          onClick={() => {
                            setRosesTargetProfile(p);
                            setShowNotificationProfileDialog(false);
                            setShowPremiumRosesDialog(true);
                          }}
                        >
                          <span className="text-2xl">🌹</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Last Active Profile Dialog */}
      <Dialog
        open={showLastActiveProfile}
        onOpenChange={(open) => {
          setShowLastActiveProfile(open);
          if (!open) setLastActiveImageIndex(0);
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          {lastActiveProfile &&
            (() => {
              const allImages = [
                lastActiveProfile.profile_image_url,
                ...(lastActiveProfile.profile_images || []),
              ].filter(Boolean) as string[];
              const p = lastActiveProfile;

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="sr-only">
                      {p.full_name}, {p.age}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Image Carousel */}
                    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-muted">
                      {allImages.length > 0 ? (
                        <>
                          <img
                            src={allImages[lastActiveImageIndex]}
                            alt={`${p.full_name} - Photo ${lastActiveImageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Gradient overlays */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                          {allImages.length > 1 && (
                            <>
                              {/* Dots moved to top */}
                              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
                                {allImages.map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full ${idx === lastActiveImageIndex ? "bg-white" : "bg-white/40"}`}
                                  />
                                ))}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full"
                                onClick={() =>
                                  setLastActiveImageIndex((prev) =>
                                    prev === 0 ? allImages.length - 1 : prev - 1
                                  )
                                }
                              >
                                <ChevronLeft className="h-6 w-6" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full"
                                onClick={() =>
                                  setLastActiveImageIndex((prev) =>
                                    prev === allImages.length - 1 ? 0 : prev + 1
                                  )
                                }
                              >
                                <ChevronRight className="h-6 w-6" />
                              </Button>
                            </>
                          )}

                          {/* Info overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                {p.full_name}
                              </h3>
                              <span className="text-2xl font-light opacity-90">{p.age}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mb-2">
                              {p.verified && (
                                <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                                  ✓ Verified
                                </Badge>
                              )}
                              {p.is_premium && (
                                <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none text-[10px] px-1.5 py-0 h-4">
                                  Premium
                                </Badge>
                              )}
                              {p.travel_mode_active && p.travel_city && (
                                <Badge className="bg-blue-500/90 backdrop-blur-sm text-white border-none text-[10px] px-1.5 py-0 h-4">
                                  ✈️ Traveling
                                </Badge>
                              )}
                              {p.video_intro_url && (
                                <Badge className="bg-background/70 text-white border-none text-[10px] px-1.5 py-0 h-4">
                                  Video
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium">
                              {p.travel_mode_active && p.travel_city ? (
                                <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                                  <span>✈️</span>
                                  <span>
                                    {t("common.travelingIn")} {p.travel_city}
                                  </span>
                                </div>
                              ) : p.city ? (
                                <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                                  <MapPin className="h-4 w-4" />
                                  <span>{p.city}</span>
                                </div>
                              ) : null}
                              {p.distance_km && (
                                <div className="backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                                  {formatDistance(p.distance_km)} away
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>

                    {/* Video Intro */}
                    {p.video_intro_url && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {t("common.videoIntro")}
                        </h4>
                        <div className="rounded-lg overflow-hidden border border-primary/20">
                          <video
                            src={p.video_intro_url}
                            controls
                            className="w-full max-h-[420px] object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {p.work && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                          <p className="font-semibold text-sm text-foreground">{p.work}</p>
                        </Card>
                      )}
                      {p.education && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                          <p className="font-semibold text-sm text-foreground">{p.education}</p>
                        </Card>
                      )}
                      {(p.height_cm || p.height) && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                          <p className="font-semibold text-sm text-foreground">
                            {p.height_cm ? `${p.height_cm} cm` : p.height}
                          </p>
                        </Card>
                      )}
                      {p.zodiac_sign && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                          <p className="font-semibold text-sm text-foreground">{p.zodiac_sign}</p>
                        </Card>
                      )}
                      {p.religion && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                          <p className="font-semibold text-sm text-foreground">{p.religion}</p>
                        </Card>
                      )}
                      {p.lifestyle && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                          <p className="font-semibold text-sm text-foreground">{p.lifestyle}</p>
                        </Card>
                      )}
                      {p.drinking && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                          <p className="font-semibold text-sm text-foreground">{p.drinking}</p>
                        </Card>
                      )}
                      {p.smoking && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                          <p className="font-semibold text-sm text-foreground">{p.smoking}</p>
                        </Card>
                      )}
                      {p.pets && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                          <p className="font-semibold text-sm text-foreground">{p.pets}</p>
                        </Card>
                      )}
                    </div>

                    {/* Bio */}
                    {p.bio && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">💬</span> About
                        </h3>
                        <p className="text-foreground leading-relaxed bg-background p-4 rounded-lg">
                          {p.bio}
                        </p>
                      </div>
                    )}

                    {/* Shared Interests */}
                    {p.interests &&
                      p.interests.length > 0 &&
                      myProfile?.interests &&
                      myProfile.interests.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span className="text-2xl">✨</span> Shared Interests
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {p.interests
                              .filter((interest) =>
                                myProfile.interests.some(
                                  (mine) => mine.toLowerCase() === interest.toLowerCase()
                                )
                              )
                              .slice(0, 3)
                              .map((interest) => (
                                <Badge key={interest} variant="secondary" className="rounded-full">
                                  {interest}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Looking For */}
                    {p.looking_for && p.looking_for.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">💕</span> Looking For
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {p.looking_for.map((item, idx) => (
                            <Badge
                              key={idx}
                              className="text-sm py-1.5 px-4 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 border-none"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interests */}
                    {p.interests && p.interests.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">✨</span> Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {p.interests.map((interest, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-sm py-1.5 px-4 rounded-full bg-primary/10 text-primary border-border"
                            >
                              {translateInterest(interest, t)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Soundtrack */}
                    {p.soundtrack_url &&
                      p.soundtrack_source &&
                      (() => {
                        const ytId =
                          p.soundtrack_source === "youtube"
                            ? extractYouTubeId(p.soundtrack_url!)
                            : null;
                        const spId =
                          p.soundtrack_source === "spotify"
                            ? extractSpotifyTrackId(p.soundtrack_url!)
                            : null;
                        if (!ytId && !spId) return null;
                        return (
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <span className="text-2xl">🎵</span> Soundtrack
                            </h3>
                            {(p.soundtrack_title || p.soundtrack_artist) && (
                              <p className="text-sm text-muted-foreground">
                                {p.soundtrack_title}
                                {p.soundtrack_artist ? ` — ${p.soundtrack_artist}` : ""}
                              </p>
                            )}
                            {ytId && (
                              <div className="rounded-xl overflow-hidden aspect-video">
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  title="Profile soundtrack"
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                            {spId && (
                              <div className="rounded-xl overflow-hidden">
                                <iframe
                                  src={`https://open.spotify.com/embed/track/${spId}?theme=0`}
                                  title="Profile soundtrack"
                                  className="w-full"
                                  height="152"
                                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* Send Instant Message - Only action */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        size="lg"
                        className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white"
                        onClick={() => {
                          setInstantMessageTargetProfile(p);
                          setShowLastActiveProfile(false);
                          setShowInstantMessageDialog(true);
                        }}
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Send Instant Message
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Daily Picks Dialog */}
      <Dialog open={showDailyPicks} onOpenChange={setShowDailyPicks}>
        <DialogContent className="max-w-sm p-0 overflow-hidden" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{t("discover.dailyPicks")}</DialogTitle>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{t("discover.dailyPicks")}</h2>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                {t("discover.freshToday")}
              </Badge>
            </div>
            <div className="space-y-2">
              {dailyPicks.map((pick) => {
                const idx = profiles.findIndex((p) => p.id === pick.id);
                return (
                  <button
                    key={pick.id}
                    className="flex items-center gap-3 w-full rounded-xl p-3 hover:bg-accent transition-colors text-left"
                    onClick={() => {
                      if (idx !== -1) {
                        setCurrentProfileIndex(idx);
                        setShowProfileDialog(true);
                        if (user) recordProfileView(user.id, pick.id);
                      }
                      setShowDailyPicks(false);
                    }}
                  >
                    <Avatar className="h-12 w-12 border-2 border-primary/30">
                      <AvatarImage src={pick.profile_image_url || ""} />
                      <AvatarFallback>{(pick.full_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {pick.full_name}
                        {pick.age ? `, ${pick.age}` : ""}
                      </p>
                      {pick.city && (
                        <p className="text-xs text-muted-foreground truncate">{pick.city}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
              {dailyPicks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("discover.noPicks")}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog open={showStoryViewer} onOpenChange={setShowStoryViewer}>
        <DialogContent
          className="max-w-md p-0 overflow-hidden bg-black border-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{t("common.storyViewer")}</DialogTitle>
          {profileStories[storyViewerIndex] && (
            <div className="relative">
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
                {profileStories.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i <= storyViewerIndex ? "bg-white w-full" : "w-0"}`}
                    />
                  </div>
                ))}
              </div>
              {/* Name + time */}
              <div className="absolute top-5 left-3 z-10 flex items-center gap-2">
                <img
                  src={currentProfile?.profile_image_url || "/placeholder.svg"}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover border-2 border-white"
                />
                <div>
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {currentProfile?.full_name}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatTimeAgo(profileStories[storyViewerIndex].created_at)}
                  </p>
                </div>
              </div>
              {/* Media */}
              {profileStories[storyViewerIndex].media_type === "video" ? (
                <video
                  src={profileStories[storyViewerIndex].media_url}
                  autoPlay
                  playsInline
                  className="w-full aspect-[9/16] object-cover"
                  onEnded={() => {
                    if (storyViewerIndex < profileStories.length - 1)
                      setStoryViewerIndex(storyViewerIndex + 1);
                    else setShowStoryViewer(false);
                  }}
                />
              ) : (
                <img
                  src={profileStories[storyViewerIndex].media_url}
                  alt="Story"
                  className="w-full aspect-[9/16] object-cover"
                />
              )}
              {/* Caption */}
              {profileStories[storyViewerIndex].caption && (
                <div className="absolute bottom-16 left-0 right-0 px-4 text-center">
                  <p className="text-white text-sm font-medium drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 inline-block">
                    {profileStories[storyViewerIndex].caption}
                  </p>
                </div>
              )}
              {/* Tap zones for prev/next */}
              <div className="absolute inset-0 flex">
                <button
                  className="w-1/2 h-full"
                  onClick={() => {
                    if (storyViewerIndex > 0) setStoryViewerIndex(storyViewerIndex - 1);
                  }}
                  aria-label={t("discover.previousStory")}
                />
                <button
                  className="w-1/2 h-full"
                  onClick={() => {
                    if (storyViewerIndex < profileStories.length - 1)
                      setStoryViewerIndex(storyViewerIndex + 1);
                    else setShowStoryViewer(false);
                  }}
                  aria-label={t("discover.nextStory")}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {user && currentProfile && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedId={currentProfile.id}
          reportedName={currentProfile.full_name}
          currentUserId={user.id}
          context="discover"
        />
      )}

      <BottomNav />

      {/* Filter discard confirmation */}
      <AlertDialog open={showFilterDiscardConfirm} onOpenChange={setShowFilterDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discover.discardFilters")}</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved filter changes. Close without applying?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFilterDiscardConfirm(false)}>
              {t("discover.keepEditing")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFilterDiscardConfirm(false);
                setShowFilterSheet(false);
              }}
            >
              {t("discover.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Discover;
