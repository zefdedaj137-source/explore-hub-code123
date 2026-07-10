import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useAuth } from "@/contexts/AuthContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Heart,
  ArrowLeft,
  MoreHorizontal,
  UserX,
  MessageCircle,
  Users,
  Settings,
  Crown,
  MapPin,
  Navigation,
  User,
  Search,
  MessageSquare,
  X,
  Ban,
  Bookmark,
  BookmarkCheck,
  Music2,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { translateInterest } from "@/utils/translateInterest";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { MatchCardSkeleton } from "@/components/LoadingSkeleton";
import ReportUserDialog from "@/components/ReportUserDialog";

interface Match {
  id: string;
  special_match_type?: string | null;
  created_at?: string;
  profile: {
    id: string;
    full_name: string;
    age: number;
    location: string;
    profile_image_url: string | null;
    profile_images?: string[];
    video_intro_url?: string | null;
    verified?: boolean | null;
    is_premium?: boolean | null;
    last_active?: string | null;
    bio?: string;
    city?: string;
    country?: string;
    interests?: string[];
    zodiac_sign?: string;
    religion?: string;
    work?: string;
    education?: string;
    height?: string;
    height_cm?: number;
    mood_emoji?: string | null;
    mood_text?: string | null;
    soundtrack_url?: string | null;
    soundtrack_source?: string | null;
    soundtrack_title?: string | null;
    soundtrack_artist?: string | null;
    looking_for?: string[];
    lifestyle?: string | null;
    drinking?: string | null;
    smoking?: string | null;
    pets?: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
    voice_url?: string | null;
  } | null;
}

interface MatchStory {
  id: string;
  media_type: string;
  media_url: string;
  caption: string | null;
  created_at: string;
}

interface InstantMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  sender_avatar?: string | null;
  sender_image?: string | null;
  receiver_name: string;
  receiver_avatar?: string | null;
  receiver_image?: string | null;
  message_content: string;
  created_at: string;
  is_sender: boolean;
  message_count: number;
}

const isOnline = (lastActive?: string | null) => {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000;
};

const getMatchSuggestions = (match: Match) => {
  const name = match.profile.full_name.split(" ")[0];
  const interests = match.profile.interests || [];
  const suggestions = [
    `Hey ${name}! What’s a perfect weekend for you?`,
    `Hi ${name}! Any fun plans this week?`,
  ];
  if (interests.length > 0) {
    suggestions.unshift(`We both like ${interests[0]}. What got you into it?`);
  }
  if (match.profile.work) {
    suggestions.push(`How did you get into ${match.profile.work}?`);
  }
  return suggestions.slice(0, 3);
};

interface InstantMessageConversation {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_sender: boolean;
}

// Helper function to format message timestamp
const formatMessageTime = (
  timestamp: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string
) => {
  if (!timestamp) {
    logger.warn("⚠️ Empty timestamp received");
    return t("common.justNow");
  }

  const date = new Date(timestamp);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    logger.warn("⚠️ Invalid timestamp:", timestamp);
    return t("common.justNow");
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t("common.justNow");
  if (diffInSeconds < 3600) return t("common.minutesAgo", { min: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t("common.hoursAgo", { hr: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 604800)
    return t("common.daysAgo", { day: Math.floor(diffInSeconds / 86400) });

  return date.toLocaleDateString("sq", { month: "short", day: "numeric" });
};

const MATCH_EXPIRY_HOURS = 168; // 7 days

const getMatchExpiryInfo = (
  match: Match,
  isPremium: boolean,
  t: (key: string, opts?: Record<string, unknown>) => string
): { isExpired: boolean; countdown: string | null } => {
  if (isPremium || match.lastMessage) return { isExpired: false, countdown: null };
  if (!match.created_at) return { isExpired: false, countdown: null };
  const expiresAt = new Date(match.created_at).getTime() + MATCH_EXPIRY_HOURS * 3600 * 1000;
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return { isExpired: true, countdown: null };
  const hoursLeft = Math.floor(msLeft / 3600000);
  if (hoursLeft < 48) {
    return {
      isExpired: false,
      countdown:
        hoursLeft < 1 ? t("common.lessThanHourLeft") : t("common.hoursLeft", { hours: hoursLeft }),
    };
  }
  return { isExpired: false, countdown: null };
};

const Matches = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [instantMessages, setInstantMessages] = useState<InstantMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [instantMessagesLoading, setInstantMessagesLoading] = useState(false);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileImageIndex, setProfileImageIndex] = useState(0);
  const [viewingProfile, setViewingProfile] = useState<Match | null>(null);
  const [isViewingFromInstantMessage, setIsViewingFromInstantMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("matches");

  // Reply to instant message state
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<InstantMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // View instant message conversation state
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [viewingConversation, setViewingConversation] = useState<InstantMessage | null>(null);
  const [conversationMessages, setConversationMessages] = useState<InstantMessageConversation[]>(
    []
  );
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [blockedByYouSet, setBlockedByYouSet] = useState<Set<string>>(new Set());
  const [bookmarkedMatchIds, setBookmarkedMatchIds] = useState<Set<string>>(new Set());

  // Story viewer state
  const [matchStories, setMatchStories] = useState<MatchStory[]>([]);
  const [showMatchStoryViewer, setShowMatchStoryViewer] = useState(false);
  const [matchStoryIndex, setMatchStoryIndex] = useState(0);
  const [currentUserIsPremium, setCurrentUserIsPremium] = useState(false);

  // Fetch bookmarked matches
  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("bookmarked_matches")
        .select("match_id")
        .eq("user_id", user.id);
      if (error) {
        logger.warn("Failed to fetch bookmarks:", error);
        return;
      }
      setBookmarkedMatchIds(new Set((data || []).map((r) => r.match_id)));
    } catch (e) {
      logger.warn("Exception fetching bookmarks:", e);
    }
  }, [user]);

  // Toggle bookmark
  const toggleBookmark = async (matchId: string) => {
    if (!user) return;
    const isBookmarked = bookmarkedMatchIds.has(matchId);
    try {
      if (isBookmarked) {
        await supabase
          .from("bookmarked_matches")
          .delete()
          .eq("user_id", user.id)
          .eq("match_id", matchId);
        setBookmarkedMatchIds((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
        toast.success(t("matches.bookmarkRemoved"));
      } else {
        await supabase.from("bookmarked_matches").insert({ user_id: user.id, match_id: matchId });
        setBookmarkedMatchIds((prev) => new Set([...prev, matchId]));
        toast.success(t("matches.matchBookmarked"));
      }
    } catch (err) {
      logger.error("Bookmark toggle error:", err);
      toast.error(t("matches.failedBookmark"));
    }
  };

  // Fetch list of users you have blocked to render overlays
  const fetchBlockedByYou = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      if (error) {
        logger.warn("Failed to fetch blocked users:", error);
        return;
      }
      const ids = new Set<string>((data || []).map((r) => r.blocked_id));
      setBlockedByYouSet(ids);
    } catch (e) {
      logger.warn("Exception fetching blocked users:", e);
    }
  }, [user]);

  const loadMyInterests = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("interests")
      .eq("id", user.id)
      .single();
    if (error) return;
    setMyInterests((data?.interests || []) as string[]);
  }, [user]);

  const fetchInstantMessages = useCallback(async () => {
    if (!user) return;

    setInstantMessagesLoading(true);
    try {
      logger.log("🔄 Fetching instant messages for user:", user.id);

      const { data, error } = await supabase.rpc("get_instant_messages", {
        p_user_id: user.id,
      });

      if (error) {
        logger.error("❌ Error fetching instant messages:", error);
        logger.error("Error details:", JSON.stringify(error, null, 2));
        toast.error(t("matches.failedToLoadMessages", { error: error.message }));
        return;
      }

      logger.log("✅ Instant messages loaded:", data);
      setInstantMessages(data || []);
    } catch (error) {
      logger.error("❌ Exception fetching instant messages:", error);
      toast.error(t("matches.failedLoadIm"));
    } finally {
      setInstantMessagesLoading(false);
    }
  }, [user, t]);

  const fetchMatches = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch actual matches from the matches table
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select(
          `
          id,
          user1_id,
          user2_id,
          created_at
        `
        )
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Collect all other-user IDs and match IDs in a single pass
      const otherUserIds: string[] = [];
      const matchIds: string[] = [];
      const matchMap = new Map<string, (typeof matchesData)[0]>();

      for (const match of matchesData) {
        const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
        otherUserIds.push(otherUserId);
        matchIds.push(match.id);
        matchMap.set(match.id, match);
      }

      // Fetch profiles and last messages in parallel — saves one full round-trip
      const [profilesResult, messagesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, age, profile_image_url, profile_images, video_intro_url, verified, is_premium, last_active, bio, city, country, location, interests, zodiac_sign, religion, work, education, height, height_cm, mood_emoji, mood_text, soundtrack_url, soundtrack_source, soundtrack_title, soundtrack_artist, looking_for, lifestyle, drinking, smoking, pets"
          )
          .in("id", otherUserIds),
        // Fetch enough rows so every match gets at least one entry even if a few
        // matches are very active.  DISTINCT ON isn't available via PostgREST, so
        // we over-fetch slightly and deduplicate client-side.
        supabase
          .from("messages")
          .select("match_id, content, created_at, sender_id, voice_url")
          .in("match_id", matchIds)
          .order("created_at", { ascending: false })
          .limit(Math.min(matchIds.length * 5, 500)),
      ]);

      const { data: profilesData, error: profilesError } = profilesResult as {
        data: Match["profile"][] | null;
        error: unknown;
      };
      const { data: messagesData } = messagesResult;

      if (profilesError) {
        logger.error("Failed to fetch match profiles:", profilesError);
      }

      const profileMap = new Map<string, Match["profile"]>();
      for (const p of profilesData || []) {
        profileMap.set(p.id, p);
      }

      const lastMessageMap = new Map<
        string,
        { content: string; created_at: string; sender_id: string; voice_url: string | null }
      >();
      for (const msg of messagesData || []) {
        // Only keep the first (most recent) message per match_id
        if (!lastMessageMap.has(msg.match_id)) {
          lastMessageMap.set(msg.match_id, msg);
        }
      }

      // Assemble the final result
      const matchesWithProfiles: Match[] = matchesData.map((match) => {
        const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
        return {
          id: match.id,
          special_match_type: null,
          profile: profileMap.get(otherUserId) || {
            id: otherUserId,
            full_name: "Unknown User",
            age: 0,
            location: "",
            profile_image_url: null,
            video_intro_url: null,
            verified: null,
            is_premium: null,
            last_active: null,
            bio: null,
            city: null,
          },
          lastMessage: lastMessageMap.get(match.id) || null,
        } as Match;
      });

      // Sort by last message time (most recent first)
      const sortedMatches = matchesWithProfiles.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return (
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime()
        );
      });

      setMatches(sortedMatches);
    } catch (error) {
      logger.error("Error fetching matches:", error);
      toast.error(t("matches.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  const { refreshing, pullDistance, touchHandlers } = usePullToRefresh(fetchMatches);
  const pullDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pullDivRef.current) {
      pullDivRef.current.style.height = `${pullDistance}px`;
    }
  }, [pullDistance]);

  const handleUnmatch = async (match: Match) => {
    if (!user) return;

    try {
      // Delete the match
      const { error: matchError } = await supabase.from("matches").delete().eq("id", match.id);

      if (matchError) throw matchError;

      // Remove both likes (clean slate)
      await supabase
        .from("likes")
        .delete()
        .or(
          `and(liker_id.eq.${user.id},liked_id.eq.${match.profile.id}),and(liker_id.eq.${match.profile.id},liked_id.eq.${user.id})`
        );

      // Remove the match from local state
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
      toast.success(t("matches.unmatched", { name: match.profile.full_name }));
    } catch (error) {
      logger.error("Error removing match:", error);
      toast.error(t("matches.failedUnmatch"));
    } finally {
      setShowUnmatchDialog(false);
      setSelectedMatch(null);
    }
  };

  const confirmUnmatch = (match: Match) => {
    setSelectedMatch(match);
    setShowUnmatchDialog(true);
  };

  const handleLikeFromInstantChat = async (profileId: string) => {
    if (!user) return;

    try {
      // Create a like
      const { error: likeError } = await supabase.from("likes").insert({
        liker_id: user.id,
        liked_id: profileId,
      });

      if (likeError) throw likeError;

      // Check if they already liked us back
      const { data: existingLike, error: checkError } = await supabase
        .from("likes")
        .select("id")
        .eq("liker_id", profileId)
        .eq("liked_id", user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        logger.error("Error checking for mutual like:", checkError);
      }

      if (existingLike) {
        // It's a match! Create a match record
        const { error: matchError } = await supabase.from("matches").insert({
          user1_id: user.id < profileId ? user.id : profileId,
          user2_id: user.id < profileId ? profileId : user.id,
        });

        if (matchError) {
          logger.error("Error creating match:", matchError);
        } else {
          // Delete all instant message messages between these users
          const { error: deleteError } = await supabase
            .from("messages")
            .delete()
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${user.id})`
            );

          if (deleteError) {
            logger.error("Error deleting instant message messages:", deleteError);
          }

          toast.success(t("matches.itsAMatch"));
          // Refresh matches list
          await fetchMatches();
        }
      } else {
        toast.success(t("matches.likeSent"));
      }

      setShowProfileDialog(false);
      // Refresh instant messages to remove if matched
      await fetchInstantMessages();
    } catch (error) {
      logger.error("Error liking profile:", error);
      toast.error(t("matches.failedLike"));
    }
  };

  const viewProfile = (match: Match) => {
    setViewingProfile(match);
    setIsViewingFromInstantMessage(false);
    setShowProfileDialog(true);
  };

  const viewInstantMessageProfile = async (message: InstantMessage) => {
    // Fetch the full profile of the other user
    const otherUserId = message.is_sender ? message.receiver_id : message.sender_id;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();

      if (error) throw error;

      // Create a Match-like object for the profile dialog
      const mockMatch: Match = {
        id: message.id,
        created_at: message.created_at,
        profile: profile,
      };

      setViewingProfile(mockMatch);
      setIsViewingFromInstantMessage(true);
      setShowProfileDialog(true);
    } catch (error) {
      logger.error("Error fetching profile:", error);
      toast.error(t("matches.failedLoadProfile"));
    }
  };

  const handleReplyToInstantMessage = (message: InstantMessage) => {
    setReplyingToMessage(message);
    setReplyMessage("");
    setShowReplyDialog(true);
  };

  const viewInstantMessageConversation = async (message: InstantMessage) => {
    setViewingConversation(message);
    setShowConversationDialog(true);
    setLoadingMessages(true);

    try {
      const otherUserId = message.is_sender ? message.receiver_id : message.sender_id;

      const { data, error } = await supabase.rpc("get_instant_message_messages", {
        user_id: user!.id,
        other_user_id: otherUserId,
      });

      if (error) {
        logger.error("Error fetching conversation:", error);
        toast.error(t("matches.failedLoadConversation"));
        return;
      }

      logger.log("📨 Conversation messages loaded:", data);
      setConversationMessages(data || []);

      // Mark messages as read (messages from the other user to current user)
      const { error: markReadError } = await supabase.rpc("mark_instant_message_as_read", {
        p_sender_id: otherUserId,
        p_receiver_id: user!.id,
      });

      if (markReadError) {
        logger.error("Error marking messages as read:", markReadError);
      } else {
        // Refresh instant messages to update unread count
        await fetchInstantMessages();
      }
    } catch (error) {
      logger.error("Error fetching conversation:", error);
      toast.error(t("matches.failedLoadConversation"));
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessageInConversation = async () => {
    if (!user || !viewingConversation || !replyMessage.trim()) return;

    // Check if user has reached the message limit (20 messages per user)
    const userMessageCount = conversationMessages.filter((msg) => msg.is_sender).length;
    if (userMessageCount >= 20) {
      toast.error(t("matches.messageLimitReached"));
      return;
    }

    setSendingReply(true);
    try {
      const otherUserId = viewingConversation.is_sender
        ? viewingConversation.receiver_id
        : viewingConversation.sender_id;

      const { data, error } = await supabase.rpc("reply_to_instant_message", {
        sender_user_id: user.id,
        receiver_user_id: otherUserId,
        message_text: replyMessage.trim(),
      });

      if (error) {
        logger.error("❌ Error sending message:", error);
        toast.error(t("matches.failedToSend", { error: error.message }));
        return;
      }

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        toast.error(result.error || t("matches.failedToSendMessage"));
        return;
      }

      // Clear input and reload messages
      setReplyMessage("");
      await viewInstantMessageConversation(viewingConversation);
    } catch (error) {
      logger.error("Error sending message:", error);
      toast.error(t("matches.failedSendMessage"));
    } finally {
      setSendingReply(false);
    }
  };

  const sendReplyToInstantMessage = async () => {
    if (!user || !replyingToMessage || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      logger.log("🔄 Sending reply to instant message:", {
        sender_user_id: user.id,
        receiver_user_id: replyingToMessage.is_sender
          ? replyingToMessage.receiver_id
          : replyingToMessage.sender_id,
        message_text: replyMessage.trim(),
      });

      // Send reply using the reply_to_instant_message function (FREE for receiver)
      const { data, error } = await supabase.rpc("reply_to_instant_message", {
        sender_user_id: user.id,
        receiver_user_id: replyingToMessage.is_sender
          ? replyingToMessage.receiver_id
          : replyingToMessage.sender_id,
        message_text: replyMessage.trim(),
      });

      if (error) {
        logger.error("❌ Supabase error:", error);
        logger.error("Error details:", JSON.stringify(error, null, 2));
        toast.error(t("matches.failedToSendReply", { error: error.message }));
        return;
      }

      logger.log("✅ Reply response:", data);

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        logger.error("❌ Reply failed:", result.error);
        toast.error(result.error || "Failed to send reply");
        return;
      }

      logger.log("🎉 Reply sent successfully!", result);

      toast.success(t("matches.replySent"));

      setShowReplyDialog(false);
      setReplyMessage("");
      setReplyingToMessage(null);

      // Refresh instant messages only (no matches update needed)
      fetchInstantMessages();
    } catch (error) {
      logger.error("Error sending reply:", error);
      toast.error(t("matches.failedReply"));
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchMatches();
    fetchBlockedByYou();
    fetchBookmarks();
    loadMyInterests();
    // Fetch current user's premium status for match expiry logic
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setCurrentUserIsPremium(!!data?.is_premium))
      .catch(() => {});

    // Fetch instant messages when tab becomes active
    if (activeTab === "instant") {
      fetchInstantMessages();
    }

    // Real-time subscription for new matches
    const matchesChannel = supabase
      .channel(`matches-realtime:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user1_id=eq.${user.id}`,
        },
        () => {
          fetchMatches();
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
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    // Live update the lastMessage preview when any message in our matches arrives
    type MsgPayload = {
      match_id: string;
      content: string;
      created_at: string;
      sender_id: string;
      voice_url: string | null;
    };
    const messagesChannel = supabase
      .channel(`matches-msgs:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as MsgPayload;
          setMatches((prev) => {
            const idx = prev.findIndex((m) => m.id === msg.match_id);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              lastMessage: {
                content: msg.content,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                voice_url: msg.voice_url ?? null,
              },
            };
            // Re-sort so the active conversation floats to the top
            return updated.sort((a, b) => {
              if (!a.lastMessage && !b.lastMessage) return 0;
              if (!a.lastMessage) return 1;
              if (!b.lastMessage) return -1;
              return (
                new Date(b.lastMessage.created_at).getTime() -
                new Date(a.lastMessage.created_at).getTime()
              );
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(messagesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, activeTab]);

  // Fetch stories when viewing a profile
  useEffect(() => {
    if (!viewingProfile) {
      setMatchStories([]);
      return;
    }
    const now = new Date().toISOString();
    supabase
      .from("stories")
      .select("id, media_type, media_url, caption, created_at")
      .eq("user_id", viewingProfile.profile.id)
      .gt("expires_at", now)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMatchStories((data as MatchStory[]) || []);
      });
  }, [viewingProfile]);

  // Separate matches into those with messages and new matches
  const matchesWithMessages = matches.filter(
    (m) => m.lastMessage && !blockedByYouSet.has(m.profile.id)
  );
  const newMatches = matches.filter((m) => !m.lastMessage);
  // Hide blocked users from New Matches section
  const visibleNewMatches = newMatches.filter((m) => !blockedByYouSet.has(m.profile.id));
  const bookmarkedMatches = matches.filter(
    (m) => bookmarkedMatchIds.has(m.id) && !blockedByYouSet.has(m.profile.id)
  );

  // IDs of users we've already matched with — hide their IMs from the Instant tab
  const matchedUserIds = new Set(matches.map((m) => m.profile.id));
  const visibleInstantMessages = instantMessages.filter((im) => {
    const otherId = im.is_sender ? im.receiver_id : im.sender_id;
    return !matchedUserIds.has(otherId);
  });

  return (
    <div className="min-h-dvh pb-24 page-bg" {...touchHandlers}>
      {pullDistance > 0 && (
        <div ref={pullDivRef} className="flex justify-center py-2">
          <div className={`text-sm text-muted-foreground ${refreshing ? "animate-spin" : ""}`}>
            {refreshing
              ? "↻"
              : pullDistance > 60
                ? t("common.releaseToRefresh")
                : t("common.pullToRefresh")}
          </div>
        </div>
      )}
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="rounded-2xl p-5 mb-6 glass-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/eagle-logo.png" alt="Shqiponja" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold text-primary">Shqiponja</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/discover")}
              className="hover:bg-muted rounded-full"
            >
              <ArrowLeft className="h-6 w-6 text-primary/80" />
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("matches.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === "matches"
                ? `${matches.length === 1 ? t("matches.matchCount", { count: matches.length }) : t("matches.matchCountPlural", { count: matches.length })}`
                : `${visibleInstantMessages.length === 1 ? t("matches.instantMessageCount", { count: visibleInstantMessages.length }) : t("matches.instantMessageCountPlural", { count: visibleInstantMessages.length })}`}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-transparent gap-4 mt-6">
              <TabsTrigger
                value="matches"
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 ${
                  activeTab === "matches"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
                style={
                  activeTab === "matches"
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(232,39,75,0.25), rgba(255,107,53,0.2))",
                        border: "1px solid rgba(232,39,75,0.4)",
                        boxShadow: "0 4px 20px rgba(232,39,75,0.2)",
                      }
                    : { background: "transparent", border: "1px solid rgba(128,128,128,0.25)" }
                }
              >
                <Heart className="h-4 w-4" />
                {t("matches.title")}
              </TabsTrigger>
              <TabsTrigger
                value="instant"
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 ${
                  activeTab === "instant"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
                style={
                  activeTab === "instant"
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(232,39,75,0.25), rgba(255,107,53,0.2))",
                        border: "1px solid rgba(232,39,75,0.4)",
                        boxShadow: "0 4px 20px rgba(232,39,75,0.2)",
                      }
                    : { background: "transparent", border: "1px solid rgba(128,128,128,0.25)" }
                }
              >
                <MessageSquare className="h-4 w-4" />
                {t("matches.instantMessages")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="matches" className="mt-0">
            {loading ? (
              <div className="grid md:grid-cols-2 gap-6 p-4">
                <MatchCardSkeleton />
                <MatchCardSkeleton />
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </div>
            ) : matches.length > 0 ? (
              <>
                {/* Search Bar */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t("common.search") + "..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full rounded-full border-0 text-white placeholder:text-white/30 focus:ring-1 focus:ring-primary/60"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    />
                  </div>
                </div>

                {/* Horizontal Circular Profile Images */}
                <div className="px-4 py-6 border-b border-border">
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                    {t("matches.yourMatches")}
                  </h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {matches
                      .filter((match) =>
                        match.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((match) => (
                        <div
                          key={match.id}
                          className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
                          onClick={() => viewProfile(match)}
                        >
                          <div className="relative">
                            <Avatar className="h-14 w-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background group-hover:ring-primary/60 transition-all duration-200 overflow-hidden">
                              <AvatarImage
                                src={match.profile.profile_image_url}
                                alt={match.profile.full_name}
                                className="object-cover w-full h-full"
                              />
                              <AvatarFallback className="bg-gradient-primary text-white text-base font-semibold">
                                {match.profile.full_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            {match.profile.video_intro_url && (
                              <div className="absolute -bottom-1 -left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full shadow text-[9px]">
                                {t("common.video")}
                              </div>
                            )}
                            {blockedByYouSet.has(match.profile.id) && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                              </div>
                            )}
                            {isOnline(match.profile.last_active) && (
                              <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-background" />
                            )}
                            {match.lastMessage && !isOnline(match.profile.last_active) && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground max-w-[70px] truncate">
                            {match.profile.full_name.split(" ")[0]}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Messages List */}
                <div className="px-4 py-6 space-y-2">
                  {/* Matches with Messages */}
                  {matchesWithMessages.length > 0 && (
                    <>
                      <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                        {t("matches.messages")}
                      </h2>
                      {matchesWithMessages
                        .filter((match) =>
                          match.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((match) => (
                          <Card
                            key={match.id}
                            className="p-4 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative group bg-card border border-white/6 rounded-2xl"
                            onClick={() => {
                              logger.log("📨 Opening chat with match:", match.id);
                              navigate(`/chat/${match.id}`);
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative flex-shrink-0">
                                <Avatar className="h-14 w-14 ring-1 ring-white/10 ring-offset-1 ring-offset-card">
                                  <AvatarImage
                                    src={match.profile.profile_image_url}
                                    alt={match.profile.full_name}
                                  />
                                  <AvatarFallback className="bg-gradient-primary text-white text-base font-semibold">
                                    {match.profile.full_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                {match.profile.video_intro_url && (
                                  <div className="absolute -bottom-1 -left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full shadow text-[9px]">
                                    {t("common.video")}
                                  </div>
                                )}
                                {blockedByYouSet.has(match.profile.id) && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                                  </div>
                                )}
                                {isOnline(match.profile.last_active) && (
                                  <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-card" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h3 className="font-semibold text-sm truncate text-foreground">
                                    {match.profile.full_name}, {match.profile.age}
                                    {match.profile.mood_emoji && (
                                      <span
                                        className="ml-1"
                                        title={match.profile.mood_text || undefined}
                                      >
                                        {match.profile.mood_emoji}
                                      </span>
                                    )}
                                  </h3>
                                  {match.lastMessage && (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                      {formatMessageTime(match.lastMessage.created_at, t)}
                                    </span>
                                  )}
                                </div>
                                {match.lastMessage && (
                                  <p className="text-xs text-muted-foreground/75 truncate">
                                    {match.lastMessage.sender_id === user?.id
                                      ? t("common.youPrefix")
                                      : ""}
                                    {match.lastMessage.voice_url
                                      ? t("common.voiceMessage")
                                      : match.lastMessage.content}
                                  </p>
                                )}
                                <Button
                                  size="sm"
                                  className="mt-2 bg-gradient-to-r from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] hover:brightness-110 text-white border-0 font-medium rounded-full px-4 text-xs shadow-[0_2px_8px_hsl(350,65%,60%,0.3)]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    logger.log(
                                      "💬 Opening chat with:",
                                      match.profile.full_name,
                                      "ID:",
                                      match.id
                                    );
                                    navigate(`/chat/${match.id}`);
                                  }}
                                >
                                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                                  {t("matches.chat")}
                                </Button>
                              </div>

                              {/* Menu Button */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      viewProfile(match);
                                    }}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    {t("matches.viewProfile")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleBookmark(match.id);
                                    }}
                                  >
                                    {bookmarkedMatchIds.has(match.id) ? (
                                      <BookmarkCheck className="h-4 w-4 mr-2 text-yellow-500" />
                                    ) : (
                                      <Bookmark className="h-4 w-4 mr-2" />
                                    )}
                                    {bookmarkedMatchIds.has(match.id)
                                      ? t("matches.removeBookmark")
                                      : t("matches.bookmark")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmUnmatch(match);
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    {t("matches.unmatch")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReportTarget({
                                        id: match.profile.id,
                                        name: match.profile.full_name,
                                      });
                                      setShowReportDialog(true);
                                    }}
                                    className="text-primary focus:text-primary"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {t("matches.report")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                    </>
                  )}

                  {/* New Matches (No Messages Yet) */}
                  {visibleNewMatches.length > 0 && (
                    <>
                      <h2 className="text-sm font-semibold text-muted-foreground mt-8 mb-4 uppercase tracking-wide">
                        {t("matches.newMatch")}
                      </h2>
                      {visibleNewMatches
                        .filter((match) =>
                          match.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((match) => (
                          <Card
                            key={match.id}
                            className={`p-4 hover:shadow-[0_16px_50px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative group bg-card border border-border/50 rounded-2xl ${
                              getMatchExpiryInfo(match, currentUserIsPremium, t).isExpired
                                ? "opacity-60 grayscale"
                                : ""
                            }`}
                            onClick={() => {
                              logger.log("📨 Opening chat with new match:", match.id);
                              navigate(`/chat/${match.id}`);
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative flex-shrink-0">
                                <Avatar className="h-16 w-16 ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
                                  <AvatarImage
                                    src={match.profile.profile_image_url}
                                    alt={match.profile.full_name}
                                  />
                                  <AvatarFallback className="bg-gradient-primary text-white text-lg font-semibold">
                                    {match.profile.full_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                {match.profile.video_intro_url && (
                                  <div className="absolute -bottom-1 -left-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                                    {t("common.video")}
                                  </div>
                                )}
                                {blockedByYouSet.has(match.profile.id) && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                                  </div>
                                )}
                                {isOnline(match.profile.last_active) && (
                                  <div className="absolute -top-1 -left-1 h-4 w-4 bg-green-500 rounded-full border-2 border-card" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-bold text-base truncate text-foreground">
                                    {match.profile.full_name}, {match.profile.age}
                                    {match.profile.mood_emoji && (
                                      <span
                                        className="ml-1"
                                        title={match.profile.mood_text || undefined}
                                      >
                                        {match.profile.mood_emoji}
                                      </span>
                                    )}
                                  </h3>
                                  <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none text-[10px] font-bold px-2">
                                    {t("matches.newMatch")}
                                  </Badge>
                                  {(() => {
                                    const expiry = getMatchExpiryInfo(
                                      match,
                                      currentUserIsPremium,
                                      t
                                    );
                                    if (expiry.isExpired)
                                      return (
                                        <Badge className="bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-bold px-2 ml-1">
                                          {t("matches.expired")}
                                        </Badge>
                                      );
                                    if (expiry.countdown)
                                      return (
                                        <Badge className="bg-orange-500/20 text-orange-500 border border-orange-500/30 text-[10px] font-bold px-2 ml-1">
                                          ⏰ {expiry.countdown}
                                        </Badge>
                                      );
                                    return null;
                                  })()}
                                </div>
                                {blockedByYouSet.has(match.profile.id) ? (
                                  <p className="text-sm text-red-600">
                                    {t("matches.youBlockedUser")}
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {t("matches.sayHi", {
                                      name: match.profile.full_name.split(" ")[0],
                                    })}
                                  </p>
                                )}
                                {!blockedByYouSet.has(match.profile.id) && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {getMatchSuggestions(match).map((text) => (
                                      <Button
                                        key={text}
                                        size="sm"
                                        variant="outline"
                                        className="border-border text-primary hover:bg-primary/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(
                                            `/chat/${match.id}?draft=${encodeURIComponent(text)}`
                                          );
                                        }}
                                      >
                                        {text}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 bg-primary hover:bg-primary text-white border-0 font-bold"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    logger.log(
                                      "💬 Opening chat with NEW match:",
                                      match.profile.full_name,
                                      "ID:",
                                      match.id
                                    );
                                    navigate(`/chat/${match.id}`);
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  {t("matches.startChat")}
                                </Button>
                              </div>

                              {/* Menu Button */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      viewProfile(match);
                                    }}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    {t("matches.viewProfile")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleBookmark(match.id);
                                    }}
                                  >
                                    {bookmarkedMatchIds.has(match.id) ? (
                                      <BookmarkCheck className="h-4 w-4 mr-2 text-yellow-500" />
                                    ) : (
                                      <Bookmark className="h-4 w-4 mr-2" />
                                    )}
                                    {bookmarkedMatchIds.has(match.id)
                                      ? t("matches.removeBookmark")
                                      : t("matches.bookmark")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmUnmatch(match);
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    {t("matches.unmatch")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                    </>
                  )}
                </div>

                {/* Bookmarked Matches */}
                {bookmarkedMatches.length > 0 && (
                  <div className="px-4 mt-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <BookmarkCheck className="h-5 w-5 text-yellow-500" />
                      {t("matches.bookmarkedSection", { count: bookmarkedMatches.length })}
                    </h3>
                    <div className="space-y-2">
                      {bookmarkedMatches.map((match) => (
                        <Card
                          key={`bookmark-${match.id}`}
                          className="p-3 cursor-pointer hover:bg-accent/50 transition-colors border border-yellow-200 dark:border-yellow-800/40"
                          onClick={() => navigate(`/chat/${match.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-400">
                                <img
                                  src={match.profile.profile_image_url || "/placeholder.svg"}
                                  alt={match.profile.full_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {match.profile.full_name}
                              </h4>
                              {match.lastMessage && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {match.lastMessage.voice_url
                                    ? t("common.voiceMessage")
                                    : match.lastMessage.content}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(match.id);
                              }}
                            >
                              <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Search Results */}
                {searchQuery &&
                  matchesWithMessages.filter((m) =>
                    m.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 &&
                  newMatches.filter((m) =>
                    m.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-12 text-center">
                      <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-semibold text-lg mb-1">{t("common.noResults")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("matches.tryDifferentSearch")}
                      </p>
                    </div>
                  )}
              </>
            ) : (
              <div className="px-4 py-12">
                <Card className="p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-border rounded-2xl backdrop-blur-sm bg-gradient-to-br from-card to-background">
                  <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-2xl font-bold mb-2">{t("matches.noMatches")}</h3>
                  <p className="text-muted-foreground mb-6">{t("matches.startSwiping")}</p>
                  <Button
                    className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                    onClick={() => navigate("/discover")}
                  >
                    {t("matches.startDiscovering")}
                  </Button>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="instant" className="mt-0">
            {instantMessagesLoading ? (
              <div className="px-4 py-12">
                <div className="grid md:grid-cols-2 gap-6">
                  <MatchCardSkeleton />
                  <MatchCardSkeleton />
                </div>
              </div>
            ) : visibleInstantMessages.length > 0 ? (
              <div className="px-4 py-6">
                <div className="space-y-4">
                  {visibleInstantMessages.map((message) => (
                    <Card
                      key={message.id}
                      className="p-4 shadow-elegant hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => viewInstantMessageConversation(message)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <Avatar
                            className="h-16 w-16 border-2 border-primary/30 cursor-pointer hover:border-primary/80 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewInstantMessageProfile(message);
                            }}
                          >
                            <AvatarImage
                              src={
                                message.is_sender
                                  ? message.receiver_avatar || undefined
                                  : message.sender_avatar || undefined
                              }
                              alt={message.is_sender ? message.receiver_name : message.sender_name}
                            />
                            <AvatarFallback>
                              <User className="h-8 w-8" />
                            </AvatarFallback>
                          </Avatar>
                          {blockedByYouSet.has(
                            message.is_sender ? message.receiver_id : message.sender_id
                          ) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3
                                className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewInstantMessageProfile(message);
                                }}
                              >
                                {message.is_sender ? message.receiver_name : message.sender_name}
                              </h3>
                              {message.message_count > 1 && (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/10 text-primary border-primary/60"
                                >
                                  {t("matches.messagesCount", { count: message.message_count })}
                                </Badge>
                              )}
                            </div>
                            <Badge variant={message.is_sender ? "default" : "secondary"}>
                              {message.is_sender ? t("matches.sent") : t("matches.received")}
                            </Badge>
                          </div>

                          <div className="bg-gradient-to-br from-primary/10 to-primary/10 p-3 rounded-lg mb-2">
                            <p className="text-sm text-foreground line-clamp-2">
                              "{message.message_content}"
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.created_at, t)}
                            </span>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewInstantMessageConversation(message);
                                }}
                                className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white hover:opacity-90"
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                {message.message_count > 1
                                  ? t("matches.viewChat")
                                  : t("matches.reply")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gradient-to-br from-primary/10 to-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm text-center text-muted-foreground">
                    <MessageSquare className="inline h-4 w-4 mb-1" />{" "}
                    {t("matches.instantMessageInfo")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 py-12">
                <Card className="p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-border rounded-2xl backdrop-blur-sm bg-gradient-to-br from-card to-primary/10/30">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold mb-2">{t("matches.noInstantMessages")}</h3>
                  <p className="text-muted-foreground mb-6">{t("matches.useCreditsPrompt")}</p>
                  <Button
                    className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white hover:opacity-90"
                    onClick={() => navigate("/discover")}
                  >
                    {t("matches.startDiscovering")}
                  </Button>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Unmatch Confirmation Dialog */}
      <AlertDialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("matches.unmatchTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("matches.unmatchDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMatch && handleUnmatch(selectedMatch)}
              className="bg-primary hover:bg-primary text-white"
            >
              {t("matches.unmatch")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {user && reportTarget && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedId={reportTarget.id}
          reportedName={reportTarget.name}
          currentUserId={user.id}
          context="matches"
        />
      )}

      {/* Profile View Dialog */}
      <Dialog
        open={showProfileDialog}
        onOpenChange={(open) => {
          setShowProfileDialog(open);
          if (!open) setProfileImageIndex(0);
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          {viewingProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">
                  {viewingProfile.profile.full_name}, {viewingProfile.profile.age}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Image Carousel */}
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-muted">
                  {viewingProfile.profile.profile_images &&
                  viewingProfile.profile.profile_images.length > 0 ? (
                    <>
                      <OptimizedImage
                        src={
                          viewingProfile.profile.profile_images[profileImageIndex] ||
                          viewingProfile.profile.profile_image_url ||
                          "/placeholder.svg"
                        }
                        alt={`${viewingProfile.profile.full_name} - Photo ${profileImageIndex + 1}`}
                        className="w-full h-full"
                      />
                      {/* Gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                      {viewingProfile.profile.profile_images.length > 1 && (
                        <>
                          {/* Dots at top */}
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
                            {viewingProfile.profile.profile_images.map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${idx === profileImageIndex ? "bg-white" : "bg-white/40"}`}
                              />
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full"
                            onClick={() =>
                              setProfileImageIndex((prev) =>
                                prev === 0
                                  ? viewingProfile.profile.profile_images!.length - 1
                                  : prev - 1
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
                              setProfileImageIndex((prev) =>
                                prev === viewingProfile.profile.profile_images!.length - 1
                                  ? 0
                                  : prev + 1
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
                            {viewingProfile.profile.full_name}
                          </h3>
                          <span className="text-2xl font-light opacity-90">
                            {viewingProfile.profile.age}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {viewingProfile.profile.verified && (
                            <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                              {t("weeklySpotlight.verified")}
                            </Badge>
                          )}
                          {viewingProfile.profile.is_premium && (
                            <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none text-[10px] px-1.5 py-0 h-4">
                              {t("common.premium")}
                            </Badge>
                          )}
                          {viewingProfile.profile.video_intro_url && (
                            <Badge className="bg-background/70 text-white border-none text-[10px] px-1.5 py-0 h-4">
                              {t("common.video")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium">
                          {viewingProfile.profile.travel_mode_active &&
                          viewingProfile.profile.travel_city ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              <span>✈️</span>
                              <span>
                                {t("common.travelingIn")} {viewingProfile.profile.travel_city}
                              </span>
                            </div>
                          ) : viewingProfile.profile.city ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              <MapPin className="h-4 w-4" />
                              <span>{viewingProfile.profile.city}</span>
                            </div>
                          ) : null}
                          {viewingProfile.profile.distance_km && (
                            <div className="backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              {t("chat.kmAway", {
                                km: Math.round(viewingProfile.profile.distance_km),
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <OptimizedImage
                        src={viewingProfile.profile.profile_image_url || "/placeholder.svg"}
                        alt={viewingProfile.profile.full_name}
                        className="w-full h-full"
                      />
                      {/* Gradient overlays for single image */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                            {viewingProfile.profile.full_name}
                          </h3>
                          <span className="text-2xl font-light opacity-90">
                            {viewingProfile.profile.age}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {viewingProfile.profile.verified && (
                            <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                              {t("weeklySpotlight.verified")}
                            </Badge>
                          )}
                        </div>
                        {viewingProfile.profile.city && (
                          <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full text-sm w-fit">
                            <MapPin className="h-4 w-4" />
                            <span>{viewingProfile.profile.city}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Video Intro */}
                {viewingProfile.profile.video_intro_url && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {t("common.videoIntro")}
                    </h4>
                    <div className="rounded-lg overflow-hidden border border-primary/20">
                      <video
                        src={viewingProfile.profile.video_intro_url}
                        controls
                        className="w-full max-h-[420px] object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Stories */}
                {matchStories.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{t("common.stories")}</h3>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {matchStories.map((story, idx) => (
                        <button
                          key={story.id}
                          onClick={() => {
                            setMatchStoryIndex(idx);
                            setShowMatchStoryViewer(true);
                            setShowProfileDialog(false);
                          }}
                          className="flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden border-2 border-primary/50 hover:border-primary transition-colors relative"
                        >
                          {story.media_type === "video" ? (
                            <video
                              src={story.media_url}
                              className="w-full h-full object-cover"
                              muted
                            />
                          ) : (
                            <img
                              src={story.media_url}
                              alt={t("profile.story")}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Camera className="h-4 w-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {viewingProfile.profile.work && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.work")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.work}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.education && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.education")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.education}
                      </p>
                    </Card>
                  )}
                  {(viewingProfile.profile.height_cm || viewingProfile.profile.height) && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.height")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.height_cm
                          ? `${viewingProfile.profile.height_cm} cm`
                          : viewingProfile.profile.height}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.zodiac_sign && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.zodiac")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.zodiac_sign}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.religion && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.religion")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.religion}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.lifestyle && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.lifestyle")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.lifestyle}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.drinking && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.drinking")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.drinking}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.smoking && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.smoking")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.smoking}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.pets && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">{t("chat.pets")}</p>
                      <p className="font-semibold text-sm text-foreground">
                        {viewingProfile.profile.pets}
                      </p>
                    </Card>
                  )}
                </div>

                {/* Bio */}
                {viewingProfile.profile.bio && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">💬</span> {t("profile.about")}
                    </h3>
                    <p className="text-foreground leading-relaxed bg-background p-4 rounded-lg">
                      {sanitizeText(viewingProfile.profile.bio)}
                    </p>
                  </div>
                )}

                {/* Shared Interests */}
                {viewingProfile.profile.interests &&
                  viewingProfile.profile.interests.length > 0 &&
                  myInterests.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">✨</span> {t("profile.sharedInterests")}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingProfile.profile.interests
                          .filter((interest) =>
                            myInterests.some(
                              (mine) => mine.toLowerCase() === interest.toLowerCase()
                            )
                          )
                          .slice(0, 3)
                          .map((interest) => (
                            <Badge key={interest} variant="secondary" className="rounded-full">
                              {translateInterest(interest, t)}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Looking For */}
                {viewingProfile.profile.looking_for &&
                  viewingProfile.profile.looking_for.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">💕</span> {t("discover.lookingFor")}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingProfile.profile.looking_for.map((item, idx) => (
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
                {viewingProfile.profile.interests &&
                  viewingProfile.profile.interests.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">✨</span> {t("profile.interests")}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingProfile.profile.interests.map((interest, idx) => (
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
                {viewingProfile.profile.soundtrack_url && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">🎵</span> {t("chat.soundtrack")}
                    </h3>
                    {viewingProfile.profile.soundtrack_title && (
                      <p className="text-sm text-muted-foreground">
                        {viewingProfile.profile.soundtrack_title}
                        {viewingProfile.profile.soundtrack_artist
                          ? ` — ${viewingProfile.profile.soundtrack_artist}`
                          : ""}
                      </p>
                    )}
                    {viewingProfile.profile.soundtrack_source === "youtube" &&
                      (() => {
                        const m = viewingProfile.profile.soundtrack_url?.match(
                          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
                        );
                        return m ? (
                          <div className="rounded-xl overflow-hidden aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${m[1]}?autoplay=0`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={t("editProfile.profileSoundtrack")}
                            />
                          </div>
                        ) : null;
                      })()}
                    {viewingProfile.profile.soundtrack_source === "spotify" &&
                      (() => {
                        const m = viewingProfile.profile.soundtrack_url?.match(
                          /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/
                        );
                        return m ? (
                          <div className="rounded-xl overflow-hidden">
                            <iframe
                              src={`https://open.spotify.com/embed/track/${m[1]}?theme=0`}
                              className="w-full"
                              height="152"
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              loading="lazy"
                              title={t("editProfile.profileSoundtrack")}
                            />
                          </div>
                        ) : null;
                      })()}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowProfileDialog(false)}
                  >
                    {t("common.close")}
                  </Button>
                  {isViewingFromInstantMessage ? (
                    <Button
                      size="lg"
                      className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikeFromInstantChat(viewingProfile.profile.id);
                      }}
                    >
                      <Heart className="h-5 w-5 mr-2" />
                      {t("common.like")}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileDialog(false);
                        navigate(`/chat/${viewingProfile.id}`);
                      }}
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      {t("chat.message")}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply to Instant Message Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {t("matches.replyTo", { name: replyingToMessage?.sender_name })}
            </DialogTitle>
            <DialogDescription>{t("matches.sendReplyDesc")}</DialogDescription>
          </DialogHeader>

          {replyingToMessage && (
            <div className="space-y-4">
              {/* Original Message */}
              <div className="bg-background p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t("matches.theirMessage")}</p>
                <p className="text-sm text-foreground">"{replyingToMessage.message_content}"</p>
              </div>

              {/* Reply Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("matches.yourReplyFree")}
                </label>
                <Textarea
                  placeholder={t("matches.writeReply")}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {replyMessage.length}/500
                </p>
              </div>

              {/* Info Banner */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/10 p-3 rounded-lg border border-primary/30">
                <p className="text-xs text-muted-foreground text-center">
                  {t("matches.freeReplyNote")}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReplyDialog(false);
                    setReplyMessage("");
                    setReplyingToMessage(null);
                  }}
                  className="flex-1"
                  disabled={sendingReply}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={sendReplyToInstantMessage}
                  disabled={!replyMessage.trim() || sendingReply}
                  className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white hover:opacity-90"
                >
                  {sendingReply ? (
                    <>{t("common.sending")}</>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {t("matches.sendReply")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Instant Message Conversation Dialog */}
      <Dialog open={showConversationDialog} onOpenChange={setShowConversationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {viewingConversation && (
                <span>
                  {t("matches.chatWith")}{" "}
                  {viewingConversation.is_sender
                    ? viewingConversation.receiver_name
                    : viewingConversation.sender_name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>{t("matches.viewAndSendMessagesInThis")}</DialogDescription>
          </DialogHeader>

          {viewingConversation && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-background via-muted to-primary/10 rounded-lg border border-border">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : conversationMessages.length > 0 ? (
                  conversationMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_sender ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 shadow-md ${
                          msg.is_sender
                            ? "bg-gradient-to-r from-primary via-primary to-primary text-white"
                            : "bg-card border border-rose-200 text-foreground"
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${msg.is_sender ? "text-rose-100" : "text-muted-foreground"}`}
                        >
                          {formatMessageTime(msg.created_at, t)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {t("matches.noMessagesYet")}
                  </div>
                )}
              </div>

              {/* Info Banner */}
              <div className="mt-3 p-2 bg-gradient-to-br from-primary/20 via-primary/20 to-primary/20 rounded-lg border border-border shadow-sm">
                <p className="text-xs text-rose-800 text-center font-medium">
                  {t("matches.messagesStayHereUntilYouBoth")}
                </p>
              </div>

              {/* Message Counter */}
              <div className="mt-2 flex items-center justify-between px-2">
                <p className="text-xs text-muted-foreground">
                  {conversationMessages.filter((msg) => msg.is_sender).length}{" "}
                  {t("matches.20MessagesSent")}
                </p>
                {conversationMessages.filter((msg) => msg.is_sender).length >= 15 && (
                  <p className="text-xs text-rose-600 font-medium">
                    {20 - conversationMessages.filter((msg) => msg.is_sender).length}{" "}
                    {t("matches.remaining")}
                  </p>
                )}
              </div>

              {/* Message Input */}
              <div className="mt-2 flex gap-2">
                <Textarea
                  placeholder={t("matches.typeMessagePlaceholder")}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (replyMessage.trim() && !sendingReply) {
                        sendMessageInConversation();
                      }
                    }
                  }}
                  maxLength={500}
                  rows={2}
                  className="flex-1 resize-none"
                />
                <Button
                  onClick={sendMessageInConversation}
                  disabled={!replyMessage.trim() || sendingReply}
                  className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white hover:opacity-90 self-end"
                >
                  {sendingReply ? (
                    <>{t("common.sending")}</>
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-right mt-1">
                {replyMessage.length}/500
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog open={showMatchStoryViewer} onOpenChange={setShowMatchStoryViewer}>
        <DialogContent className="max-w-sm p-0 bg-black border-none" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{t("common.storyViewer")}</DialogTitle>
          {matchStories[matchStoryIndex] && viewingProfile && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
                {matchStories.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i <= matchStoryIndex ? "bg-white w-full" : "w-0"}`}
                    />
                  </div>
                ))}
              </div>
              <div className="absolute top-5 left-3 z-10 flex items-center gap-2">
                <img
                  src={viewingProfile.profile.profile_image_url || "/placeholder.svg"}
                  alt={viewingProfile.profile.full_name}
                  className="h-8 w-8 rounded-full object-cover border-2 border-white"
                />
                <p className="text-sm font-semibold text-white drop-shadow">
                  {viewingProfile.profile.full_name}
                </p>
              </div>
              {matchStories[matchStoryIndex].media_type === "video" ? (
                <video
                  src={matchStories[matchStoryIndex].media_url}
                  autoPlay
                  playsInline
                  className="w-full aspect-[9/16] object-cover"
                  onEnded={() => {
                    if (matchStoryIndex < matchStories.length - 1)
                      setMatchStoryIndex(matchStoryIndex + 1);
                    else setShowMatchStoryViewer(false);
                  }}
                />
              ) : (
                <img
                  src={matchStories[matchStoryIndex].media_url}
                  alt={t("profile.story")}
                  className="w-full aspect-[9/16] object-cover"
                />
              )}
              {matchStories[matchStoryIndex].caption && (
                <div className="absolute bottom-16 left-0 right-0 px-4 text-center">
                  <p className="text-white text-sm font-medium drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 inline-block">
                    {matchStories[matchStoryIndex].caption}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 flex">
                <button
                  className="w-1/2 h-full"
                  onClick={() => {
                    if (matchStoryIndex > 0) setMatchStoryIndex(matchStoryIndex - 1);
                  }}
                  aria-label={t("matches.previousStory")}
                />
                <button
                  className="w-1/2 h-full"
                  onClick={() => {
                    if (matchStoryIndex < matchStories.length - 1)
                      setMatchStoryIndex(matchStoryIndex + 1);
                    else setShowMatchStoryViewer(false);
                  }}
                  aria-label={t("matches.nextStory")}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Matches;
