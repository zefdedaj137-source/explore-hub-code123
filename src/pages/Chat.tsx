import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/sanitize";
import { analytics } from "@/lib/analytics";
import { enqueue } from "@/lib/offlineQueue";
import { containsProfanity } from "@/lib/profanityFilter";
import { compressImage } from "@/lib/imageCompress";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  X,
  MapPin,
  MessageCircle,
  Calendar,
  Pin,
  Clock,
  Camera,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { translateInterest } from "@/utils/translateInterest";
import { CallDialog } from "@/components/CallDialog";
import ReportUserDialog from "@/components/ReportUserDialog";
import BottomNav from "@/components/BottomNav";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import {
  isBlockedBetween,
  blockUser as blockUserApi,
  unblockUser as unblockUserApi,
} from "@/lib/blocking";
import type { Database } from "@/integrations/supabase/types";

import { MessageSkeleton } from "@/components/LoadingSkeleton";

// Cached audio elements — created once at module load to avoid GC pressure
const sentSound = new Audio("/message-sent.mp3");
sentSound.volume = 0.5;
const receivedSound = new Audio("/message-received.mp3");
receivedSound.volume = 0.6;

const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(1000, { message: "Message must be less than 1000 characters" }),
});

const icebreakerPrompts = [
  "What’s a perfect weekend for you?",
  "Any hidden talents I should know about?",
  "Pick a spontaneous date: coffee, walk, or live music?",
  "What’s a show or movie you’re into right now?",
];

type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  voice_url?: string;
  image_url?: string;
  read_at?: string | null;
  receiver_id?: string | null;
  reply_to_id?: string | null;
  deleted_at?: string | null;
}

interface MatchProfile {
  full_name: string;
  profile_image_url: string | null;
  profile_images?: string[];
  age?: number;
  bio?: string;
  city?: string;
  country?: string;
  location?: string;
  interests?: string[];
  work?: string;
  education?: string;
  height?: string;
  height_cm?: number;
  zodiac_sign?: string;
  religion?: string;
  verified?: boolean;
  is_premium?: boolean;
  video_intro_url?: string | null;
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
  travel_mode_active?: boolean | null;
  travel_city?: string | null;
  distance_km?: number | null;
  last_active?: string | null;
}

interface MatchStory {
  id: string;
  media_type: string;
  media_url: string;
  caption: string | null;
  created_at: string;
}

const Chat = () => {
  const { t } = useTranslation();
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const { state: navState } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [matchProfile, setMatchProfile] = useState<MatchProfile | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileImageIndex, setProfileImageIndex] = useState(0);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportsReadReceipts, setSupportsReadReceipts] = useState(true);
  const [supportsReplyTo, setSupportsReplyTo] = useState(true);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const justLoadedOlderRef = useRef(false);
  const MESSAGE_PAGE_SIZE = 50;

  // Premium and user IDs
  const [isPremium, setIsPremium] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string>("");
  const [otherUserLastActive, setOtherUserLastActive] = useState<string | null>(null);
  const [blockedByYou, setBlockedByYou] = useState(false);
  const [blockedYou, setBlockedYou] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(true);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Pre-populate message from match animation opener (InstantChat)
  useEffect(() => {
    const opener = (navState as { opener?: string } | null)?.opener;
    if (opener) {
      setNewMessage(opener);
      setShowIcebreakers(false);
    }
  }, [navState]);

  // Date plan states
  const [showDatePlanDialog, setShowDatePlanDialog] = useState(false);
  const [datePlanDateTime, setDatePlanDateTime] = useState("");
  const [datePlanLocation, setDatePlanLocation] = useState("");
  const [datePlanNotes, setDatePlanNotes] = useState("");
  const [creatingDatePlan, setCreatingDatePlan] = useState(false);
  const [confirmedDatePlan, setConfirmedDatePlan] = useState<{
    id: string;
    location: string;
    scheduled_for: string;
    notes: string | null;
    status: string;
    planner_id: string;
  } | null>(null);

  // Voice message states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Photo message states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Call states
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [isAnsweringCall, setIsAnsweringCall] = useState(false);
  const [matchStories, setMatchStories] = useState<MatchStory[]>([]);
  const [showMatchStoryViewer, setShowMatchStoryViewer] = useState(false);
  const [matchStoryIndex, setMatchStoryIndex] = useState(0);
  const autoAnsweredRef = useRef(false);
  const reactionsTableMissing = useRef(
    (() => {
      try {
        localStorage.removeItem("__reactions_table_ok"); // clean up stale key
        const v = localStorage.getItem("__reactions_table_missing");
        return !!v && Date.now() - Number(v) < 24 * 60 * 60 * 1000;
      } catch {
        return false;
      }
    })()
  );
  const lastSendTime = useRef(0);
  const prevReactionIdsRef = useRef("");

  // Message reactions
  const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>(
    {}
  );
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);

  // GIF picker
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; url: string; preview: string }[]>([]);
  const [searchingGifs, setSearchingGifs] = useState(false);

  // Reply & delete
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // Message search
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState<Message[]>([]);
  const [chatStreak, setChatStreak] = useState(0);

  // Auto-answer incoming call
  useEffect(() => {
    const autoAnswerType = searchParams.get("autoAnswer");
    if (
      autoAnswerType &&
      (autoAnswerType === "voice" || autoAnswerType === "video") &&
      !autoAnsweredRef.current
    ) {
      logger.log("🎯 Auto-answering call:", autoAnswerType);
      autoAnsweredRef.current = true;
      setCallType(autoAnswerType);
      setIsAnsweringCall(true); // Mark as answering
      setShowCallDialog(true);
      // Don't clear URL here - let it stay until dialog closes
    }
  }, [searchParams]); // Only depend on searchParams

  // Clear URL parameter and reset ref when dialog closes
  useEffect(() => {
    if (!showCallDialog && autoAnsweredRef.current) {
      // Dialog just closed, clean up
      autoAnsweredRef.current = false;
      // Clear autoAnswer param from URL if present
      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.get("autoAnswer")) {
        navigate(`/chat/${matchId}`, { replace: true });
      }
    }
  }, [showCallDialog, matchId, navigate]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll when messages change
  useEffect(() => {
    if (justLoadedOlderRef.current) {
      justLoadedOlderRef.current = false;
      return;
    }
    scrollToBottom();
  }, [messages]);

  // Start voice recording
  const startRecording = async () => {
    try {
      if (blockedByYou) {
        toast.error(t("chat.blockMessage"));
        return;
      }
      if (blockedYou) {
        toast.error(t("chat.blockedMessage"));
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info(t("chat.recordingVoice"));
    } catch (error) {
      logger.error("Error starting recording:", error);
      toast.error(t("chat.cantAccessMicrophone"));
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success(t("chat.voiceMessageRecorded"));
    }
  };

  // Send voice message
  const sendVoiceMessage = async () => {
    if (!audioBlob || !user || !matchId) return;
    if (blockedByYou || blockedYou) return;

    const tempVoiceUrl = URL.createObjectURL(audioBlob);
    const optimisticMessage: Message = {
      id: `temp-voice-${Date.now()}`,
      sender_id: user.id,
      content: `[Voice Message]`,
      created_at: new Date().toISOString(),
      voice_url: tempVoiceUrl,
    };

    try {
      setMessages((prev) => [...prev, optimisticMessage]);
      setAudioBlob(null);

      // Upload audio to Supabase Storage
      const fileName = `voice-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("voice-messages")
        .upload(`${user.id}/${fileName}`, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("voice-messages")
        .getPublicUrl(uploadData.path);

      // Save message with voice URL
      const data = await insertMessageWithFallback({
        match_id: matchId,
        sender_id: user.id,
        receiver_id: otherUserId || null,
        content: `[Voice Message]`,
        voice_url: urlData.publicUrl,
      });

      // Replace optimistic message with real one from database
      if (data) {
        URL.revokeObjectURL(tempVoiceUrl);
        setMessages((prev) => {
          // Remove the optimistic message
          const withoutOptimistic = prev.filter((msg) => msg.id !== optimisticMessage.id);

          // Check if real message already exists (might have come via Realtime)
          const realExists = withoutOptimistic.some((msg) => msg.id === data.id);

          if (realExists) {
            logger.log("✅ Real voice message already received via Realtime");
            return withoutOptimistic;
          }

          logger.log("✅ Replacing optimistic voice message with real one");
          return [...withoutOptimistic, data as Message];
        });
        updateMessageStreak();
      }

      toast.success(t("chat.voiceMessageSent"));
    } catch (error) {
      logger.error("Error sending voice message:", error);
      toast.error(t("chat.failedVoice"));
      URL.revokeObjectURL(tempVoiceUrl);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    }
  };

  // Handle photo file selection (from gallery or camera)
  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("chat.selectImage"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("chat.imageTooLarge"));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const clearImagePreview = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
  };

  // Send photo message
  const sendPhotoMessage = async () => {
    if (!imageFile || !user || !matchId) return;
    if (blockedByYou || blockedYou) return;

    setSendingImage(true);
    try {
      const tempUrl = imagePreview!;
      // Optimistic message
      const optimisticMessage: Message = {
        id: `temp-img-${Date.now()}`,
        sender_id: user.id,
        content: "[Photo]",
        created_at: new Date().toISOString(),
        image_url: tempUrl,
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setImagePreview(null);
      setImageFile(null);

      // Compress & upload to Supabase Storage
      const compressed = await compressImage(imageFile);
      const ext = compressed.name.split(".").pop() || "jpg";
      const fileName = `chat-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(`${user.id}/${fileName}`, compressed, { contentType: compressed.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(uploadData.path);

      // Insert message
      const data = await insertMessageWithFallback({
        match_id: matchId,
        sender_id: user.id,
        receiver_id: otherUserId || null,
        content: "[Photo]",
        image_url: urlData.publicUrl,
      });

      if (data) {
        URL.revokeObjectURL(tempUrl);
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((msg) => msg.id !== optimisticMessage.id);
          const realExists = withoutOptimistic.some((msg) => msg.id === data.id);
          if (realExists) return withoutOptimistic;
          return [...withoutOptimistic, data as Message];
        });
        updateMessageStreak();
      }

      sentSound.play().catch(() => {});

      toast.success(t("chat.photoSent"));
    } catch (error) {
      logger.error("Error sending photo:", error);
      toast.error(t("chat.failedPhoto"));
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith("temp-img-")));
    } finally {
      setSendingImage(false);
    }
  };

  // Start voice call
  const startVoiceCall = () => {
    if (!user || !matchId) return;
    if (blockedByYou) {
      toast.error(t("chat.blockMessage"));
      return;
    }
    if (blockedYou) {
      toast.error(t("chat.blockedMessage"));
      return;
    }

    if (!isPremium) {
      toast.error(t("chat.callsNotAvailable"), {
        action: {
          label: t("common.upgrade"),
          onClick: () => navigate("/premium"),
        },
      });
      return;
    }

    analytics.callStarted("voice");
    setCallType("voice");
    setIsAnsweringCall(false); // Initiating new call
    setShowCallDialog(true);
  };

  // Start video call
  const startVideoCall = () => {
    if (!user || !matchId) return;
    if (blockedByYou) {
      toast.error(t("chat.blockMessage"));
      return;
    }
    if (blockedYou) {
      toast.error(t("chat.blockedMessage"));
      return;
    }

    if (!isPremium) {
      toast.error(t("chat.callsNotAvailable"), {
        action: {
          label: t("common.upgrade"),
          onClick: () => navigate("/premium"),
        },
      });
      return;
    }

    setCallType("video");
    setIsAnsweringCall(false); // Initiating new call
    setShowCallDialog(true);
  };

  const fetchMatchProfile = useCallback(async () => {
    if (!user || !matchId) return;

    // Reset stale state from previous chat immediately
    setConfirmedDatePlan(null);
    setMatchProfile(null);

    try {
      // Round 1: fetch match info and current-user profile in parallel
      const [matchResult, currentUserResult] = await Promise.all([
        supabase
          .from("matches")
          .select("user1_id, user2_id, special_match_type")
          .eq("id", matchId)
          .maybeSingle(),
        supabase.from("profiles").select("is_premium, interests").eq("id", user.id).single(),
      ]);

      const matchData = matchResult.data;
      if (!matchData) throw new Error("Match not found");

      const otherId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id;
      setOtherUserId(otherId);

      const currentUserProfile = currentUserResult.data;
      setIsPremium(currentUserProfile?.is_premium || false);
      setMyInterests((currentUserProfile?.interests || []) as string[]);

      // Round 2: fetch other-user profile, date plans and blocking check in parallel
      const [profileResult, datePlanResult, blockResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name, profile_image_url, profile_images, age, bio, city, country, location, interests, work, education, height, height_cm, zodiac_sign, religion, verified, is_premium, video_intro_url, mood_emoji, mood_text, soundtrack_url, soundtrack_source, soundtrack_title, soundtrack_artist, looking_for, lifestyle, drinking, smoking, pets, last_active"
          )
          .eq("id", otherId)
          .single(),
        supabase
          .from("date_plans")
          .select("id, location, scheduled_for, notes, status, planner_id")
          .eq("match_id", matchId)
          .or(`planner_id.eq.${user.id},partner_id.eq.${user.id}`)
          .in("status", ["confirmed", "proposed"])
          .order("scheduled_for", { ascending: true })
          .limit(1),
        isBlockedBetween(user.id, otherId),
      ]);

      const profileData = profileResult.data;
      setMatchProfile(profileData as unknown as MatchProfile | null);
      if ((profileData as unknown as MatchProfile | null)?.last_active) {
        setOtherUserLastActive((profileData as unknown as MatchProfile).last_active!);
      }

      const datePlanData = datePlanResult.data;
      if (datePlanData && datePlanData.length > 0) {
        setConfirmedDatePlan(datePlanData[0]);
      } else {
        setConfirmedDatePlan(null);
      }

      setBlockedByYou(blockResult.blockedByYou);
      setBlockedYou(blockResult.blockedYou);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load profile");
    }
  }, [user, matchId]);

  const fetchMessages = useCallback(
    async (before?: string) => {
      if (!matchId) return;

      const isLoadingOlder = !!before;
      if (isLoadingOlder) setLoadingOlder(true);

      try {
        const primarySelect =
          "id, content, sender_id, receiver_id, created_at, voice_url, image_url, read_at, deleted_at";
        const fallbackSelect =
          "id, content, sender_id, receiver_id, created_at, voice_url, image_url, deleted_at";
        const minimalSelect = "id, content, sender_id, created_at, voice_url, image_url";

        const buildQuery = (selectCols: string) => {
          let q = supabase
            .from("messages")
            .select(selectCols)
            .eq("match_id", matchId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(MESSAGE_PAGE_SIZE);
          if (before) q = q.lt("created_at", before);
          return q;
        };

        const { data, error } = await buildQuery(primarySelect);

        if (!error) {
          const sorted = ((data || []) as unknown as Message[]).reverse();
          if (isLoadingOlder) {
            setMessages((prev) => [...sorted, ...prev]);
          } else {
            setMessages(sorted);
          }
          setHasOlderMessages((data || []).length === MESSAGE_PAGE_SIZE);
          setSupportsReadReceipts(true);
          if (isLoadingOlder) setLoadingOlder(false);
          else setLoading(false);
          return;
        }

        logger.error("Failed to load messages with read receipts:", error);
        const { data: fallbackData, error: fallbackError } = await buildQuery(fallbackSelect);

        if (!fallbackError) {
          const sorted = ((fallbackData || []) as unknown as Message[]).reverse();
          if (isLoadingOlder) {
            setMessages((prev) => [...sorted, ...prev]);
          } else {
            setMessages(sorted);
          }
          setHasOlderMessages((fallbackData || []).length === MESSAGE_PAGE_SIZE);
          setSupportsReadReceipts(false);
          if (isLoadingOlder) setLoadingOlder(false);
          else setLoading(false);
          return;
        }

        logger.error("Failed to load messages with receiver_id:", fallbackError);
        const { data: minimalData, error: minimalError } = await buildQuery(minimalSelect);

        if (minimalError) throw minimalError;
        const sorted = ((minimalData || []) as unknown as Message[]).reverse();
        if (isLoadingOlder) {
          setMessages((prev) => [...sorted, ...prev]);
        } else {
          setMessages(sorted);
        }
        setHasOlderMessages((minimalData || []).length === MESSAGE_PAGE_SIZE);
        setSupportsReadReceipts(false);
      } catch (error) {
        toast.error((error as Error).message || "Failed to load messages");
      } finally {
        if (isLoadingOlder) setLoadingOlder(false);
        else setLoading(false);
      }
    },
    [matchId]
  );

  const loadOlderMessages = useCallback(() => {
    if (!hasOlderMessages || loadingOlder || messages.length === 0) return;
    const container = messagesContainerRef.current;
    const prevHeight = container?.scrollHeight || 0;
    justLoadedOlderRef.current = true;
    fetchMessages(messages[0].created_at).then(() => {
      // Preserve scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });
    });
  }, [hasOlderMessages, loadingOlder, messages, fetchMessages]);

  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markMessagesRead = useCallback(async () => {
    if (!user || !matchId || !supportsReadReceipts) return;
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(async () => {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("match_id", matchId)
        .eq("receiver_id", user.id)
        .is("read_at", null);
    }, 1000);
  }, [user, matchId, supportsReadReceipts]);

  const insertMessageWithFallback = async (payload: MessageInsert) => {
    const selectColumnsExtended =
      "id, content, sender_id, created_at, voice_url, image_url, reply_to_id, deleted_at";
    const selectColumnsBasic = "id, content, sender_id, created_at, voice_url, image_url";
    const initialPayload: MessageInsert = supportsReadReceipts
      ? payload
      : (() => {
          if (payload.receiver_id) {
            const { receiver_id, ...rest } = payload;
            return rest;
          }
          return payload;
        })();

    // Skip extended columns if we already know they're not supported
    if (!supportsReplyTo) {
      const cleanPayload = { ...initialPayload } as Record<string, unknown>;
      delete cleanPayload.reply_to_id;
      const { data, error } = await supabase
        .from("messages")
        .insert(cleanPayload as MessageInsert)
        .select(selectColumnsBasic)
        .single();
      if (!error) return data as Message | null;
      if (
        cleanPayload.receiver_id ||
        (error as Error).message?.toLowerCase().includes("receiver_id")
      ) {
        const { receiver_id, ...fb } = cleanPayload as Record<string, unknown> & {
          receiver_id?: unknown;
        };
        const { data: fbData, error: fbErr } = await supabase
          .from("messages")
          .insert(fb as MessageInsert)
          .select(selectColumnsBasic)
          .single();
        if (!fbErr) {
          setSupportsReadReceipts(false);
          return fbData as Message | null;
        }
        throw fbErr;
      }
      throw error;
    }

    // Try with extended columns first (reply_to_id, deleted_at)
    const { data, error } = await supabase
      .from("messages")
      .insert(initialPayload)
      .select(selectColumnsExtended)
      .single();

    if (!error) return data as unknown as Message | null;

    const errorMessage = (error as Error).message || "";

    // If reply_to_id column doesn't exist yet, retry without it
    if (errorMessage.includes("reply_to_id") || errorMessage.includes("deleted_at")) {
      setSupportsReplyTo(false);
      // Strip reply_to_id from payload
      const cleanPayload = { ...initialPayload } as Record<string, unknown>;
      delete cleanPayload.reply_to_id;
      const { data: cleanData, error: cleanError } = await supabase
        .from("messages")
        .insert(cleanPayload as MessageInsert)
        .select(selectColumnsBasic)
        .single();
      if (!cleanError) return cleanData as Message | null;
    }

    if (payload.receiver_id || errorMessage.toLowerCase().includes("receiver_id")) {
      const { receiver_id, ...fallbackPayload } = payload;
      // Remove reply_to_id from fallback too if needed
      const cleanFallback = { ...fallbackPayload } as Record<string, unknown>;
      delete cleanFallback.reply_to_id;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("messages")
        .insert(cleanFallback as MessageInsert)
        .select(selectColumnsBasic)
        .single();

      if (!fallbackError) {
        setSupportsReadReceipts(false);
        return fallbackData as Message | null;
      }

      throw fallbackError;
    }

    throw error;
  };

  const updateMessageStreak = () => {
    if (!user) return;
    const key = `match_streak_${user.id}`;
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const getWeekStart = () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().slice(0, 10);
    };

    const raw = localStorage.getItem(key);
    const currentWeekStart = getWeekStart();
    const state = raw
      ? (JSON.parse(raw) as {
          lastMessageDate: string | null;
          streak: number;
          weekStart: string;
          messagesThisWeek: number;
        })
      : { lastMessageDate: null, streak: 0, weekStart: currentWeekStart, messagesThisWeek: 0 };

    if (state.weekStart !== currentWeekStart) {
      state.weekStart = currentWeekStart;
      state.messagesThisWeek = 0;
    }

    if (state.lastMessageDate !== todayKey) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().slice(0, 10);
      state.streak = state.lastMessageDate === yesterdayKey ? state.streak + 1 : 1;
      state.lastMessageDate = todayKey;
    }

    state.messagesThisWeek += 1;
    localStorage.setItem(key, JSON.stringify(state));
    setChatStreak(state.streak);
  };

  const handleCancelDatePlan = async () => {
    if (!user || !confirmedDatePlan || confirmedDatePlan.id === "new") return;

    try {
      const { error } = await supabase
        .from("date_plans")
        .update({ status: "canceled" })
        .eq("id", confirmedDatePlan.id);

      if (error) throw error;

      // Send cancel message in chat
      if (matchId) {
        const formattedDate = new Date(confirmedDatePlan.scheduled_for).toLocaleString();
        const chatMessage = t("chat.dateCanceledMsg", {
          location: confirmedDatePlan.location,
          date: formattedDate,
        });
        const { error: msgError } = await supabase.from("messages").insert({
          match_id: matchId,
          sender_id: user.id,
          receiver_id: otherUserId,
          content: chatMessage,
        });
        if (msgError) {
          await supabase.from("messages").insert({
            match_id: matchId,
            sender_id: user.id,
            content: chatMessage,
          });
        }
      }

      setConfirmedDatePlan(null);
      toast.success(t("chat.dateCanceled"));
    } catch (error) {
      logger.error("Cancel date plan error:", error);
      toast.error(t("chat.failedCancelDate"));
    }
  };

  const handleRespondDatePlan = async (accept: boolean) => {
    if (!user || !confirmedDatePlan || confirmedDatePlan.id === "new") return;

    const newStatus = accept ? "confirmed" : "canceled";
    try {
      const { error } = await supabase
        .from("date_plans")
        .update({ status: newStatus })
        .eq("id", confirmedDatePlan.id);

      if (error) throw error;

      if (matchId) {
        const formattedDate = new Date(confirmedDatePlan.scheduled_for).toLocaleString();
        const chatMessage = accept
          ? t("chat.dateAcceptedMsg", { location: confirmedDatePlan.location, date: formattedDate })
          : t("chat.dateDeclinedMsg", {
              location: confirmedDatePlan.location,
              date: formattedDate,
            });
        const { error: msgError } = await supabase.from("messages").insert({
          match_id: matchId,
          sender_id: user.id,
          receiver_id: otherUserId,
          content: chatMessage,
        });
        if (msgError) {
          await supabase.from("messages").insert({
            match_id: matchId,
            sender_id: user.id,
            content: chatMessage,
          });
        }
      }

      if (accept) {
        setConfirmedDatePlan((prev) => (prev ? { ...prev, status: "confirmed" } : prev));
        toast.success(t("chat.dateAccepted"));
      } else {
        setConfirmedDatePlan(null);
        toast.success(t("chat.dateDeclined"));
      }
    } catch (error) {
      logger.error("Respond to date plan error:", error);
      toast.error(t("chat.failedDateResponse"));
    }
  };

  const handleCreateDatePlan = async () => {
    if (!user || !matchId || !otherUserId) return;
    if (!datePlanDateTime || !datePlanLocation) {
      toast.error(t("chat.fillDateLocation"));
      return;
    }

    setCreatingDatePlan(true);
    try {
      // Check for an existing active plan with this person
      const { data: existingPlans } = await supabase
        .from("date_plans")
        .select("id, status, scheduled_for")
        .or(
          `and(planner_id.eq.${user.id},partner_id.eq.${otherUserId}),and(planner_id.eq.${otherUserId},partner_id.eq.${user.id})`
        )
        .in("status", ["proposed", "confirmed"])
        .gte("scheduled_for", new Date().toISOString())
        .limit(1);

      if (existingPlans && existingPlans.length > 0) {
        toast.error(
          "You already have an active date plan. Cancel it or wait for it to pass before creating a new one."
        );
        setCreatingDatePlan(false);
        return;
      }

      // Insert date plan
      const { data: planData, error: planError } = await supabase
        .from("date_plans")
        .insert({
          match_id: matchId,
          planner_id: user.id,
          partner_id: otherUserId,
          scheduled_for: new Date(datePlanDateTime).toISOString(),
          location: datePlanLocation,
          notes: datePlanNotes || null,
        })
        .select("id")
        .single();

      if (planError) throw planError;

      // Send chat message
      const formattedDate = new Date(datePlanDateTime).toLocaleString();
      const chatMessage = t("chat.datePlannedMsg", {
        location: datePlanLocation,
        date: formattedDate,
        notes: datePlanNotes ? `\n📝 ${datePlanNotes}` : "",
      });

      const { error: msgError } = await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: chatMessage,
      });
      if (msgError) {
        // Fallback without receiver_id
        await supabase.from("messages").insert({
          match_id: matchId,
          sender_id: user.id,
          content: chatMessage,
        });
      }

      toast.success(t("chat.datePlanCreated"));
      setShowDatePlanDialog(false);
      setDatePlanDateTime("");
      setDatePlanLocation("");
      setDatePlanNotes("");
      // Show as pinned
      setConfirmedDatePlan({
        id: planData.id,
        location: datePlanLocation,
        scheduled_for: new Date(datePlanDateTime).toISOString(),
        notes: datePlanNotes || null,
        status: "proposed",
        planner_id: user.id,
      });
    } catch (error) {
      logger.error("Create date plan error:", error);
      toast.error(t("chat.failedCreateDate"));
    } finally {
      setCreatingDatePlan(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !matchId) return;
    // Rate limit: 1 message per 300ms
    const now = Date.now();
    if (now - lastSendTime.current < 300) return;
    lastSendTime.current = now;
    if (blockedByYou) {
      toast.error(t("chat.blockMessage"));
      return;
    }
    if (blockedYou) {
      toast.error(t("chat.blockedMessage"));
      return;
    }

    try {
      // Validate message content
      const validationResult = messageSchema.safeParse({ content: newMessage });

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      const messageContent = validationResult.data.content;

      if (containsProfanity(messageContent)) {
        toast.error(t("chat.inappropriateMsg"));
        return;
      }

      // Optimistic UI update - add message immediately
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        content: messageContent,
        created_at: new Date().toISOString(),
        reply_to_id: replyingTo?.id || null,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");
      setShowIcebreakers(false);
      setReplyingTo(null);

      // Play sent message sound
      sentSound.play().catch(() => {
        // Ignore if audio fails to play (user interaction required)
      });

      analytics.messageSent(matchId);
      const insertPayload: Record<string, unknown> = {
        match_id: matchId,
        sender_id: user.id,
        receiver_id: otherUserId || null,
        content: messageContent,
      };
      if (replyingTo) insertPayload.reply_to_id = replyingTo.id;
      const data = await insertMessageWithFallback(insertPayload as MessageInsert);

      // Replace optimistic message with real one from database
      if (data) {
        setMessages((prev) => {
          // Remove the optimistic message and add the real one
          const withoutOptimistic = prev.filter((msg) => msg.id !== optimisticMessage.id);

          // Check if real message already exists (might have come via Realtime)
          const realExists = withoutOptimistic.some((msg) => msg.id === data.id);

          if (realExists) {
            logger.log("✅ Real message already received via Realtime");
            return withoutOptimistic;
          }

          logger.log("✅ Replacing optimistic message with real one");
          return [...withoutOptimistic, data as Message];
        });
        updateMessageStreak();
        // Notify receiver via push notification (fire-and-forget)
        if (otherUserId) {
          supabase.functions
            .invoke("send-push", {
              body: {
                user_id: otherUserId,
                title: matchProfile?.full_name || "New message",
                body: messageContent.slice(0, 80),
                url: `/chat/${matchId}`,
              },
            })
            .catch((err) => logger.error("send-push (message) failed:", err));
        }
      }
    } catch (error) {
      // Queue for offline retry if network is down
      if (!navigator.onLine) {
        enqueue({
          table: "messages",
          method: "insert",
          payload: {
            match_id: matchId,
            sender_id: user.id,
            receiver_id: otherUserId || null,
            content: messageContent,
          },
        });
        toast.info(t("chat.offlineMessage"));
      } else {
        toast.error((error as Error).message || "Failed to send message");
      }
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith("temp-")));
    }
  };

  // --- Message Reactions ---
  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0 || reactionsTableMissing.current) return;
    const { data, error } = await supabase
      .from("message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);
    if (error) {
      reactionsTableMissing.current = true;
      try {
        localStorage.setItem("__reactions_table_missing", String(Date.now()));
      } catch {
        /* */
      }
      return;
    }
    if (data) {
      const grouped: Record<string, { emoji: string; user_id: string }[]> = {};
      for (const r of data as { message_id: string; emoji: string; user_id: string }[]) {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
      }
      setReactions(grouped);
    }
  }, []);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user || reactionsTableMissing.current) {
      if (reactionsTableMissing.current) toast.error(t("chat.reactionsUnavailable"));
      return;
    }
    const existing = reactions[messageId]?.find((r) => r.emoji === emoji && r.user_id === user.id);
    // Optimistic update — no round-trip delay for the user
    setReactions((prev) => {
      const current = prev[messageId] || [];
      const next = existing
        ? current.filter((r) => !(r.emoji === emoji && r.user_id === user.id))
        : [...current, { emoji, user_id: user.id }];
      return { ...prev, [messageId]: next };
    });
    setReactionPickerMsgId(null);
    try {
      if (existing) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, user_id: user.id, emoji });
      }
    } catch {
      // Revert optimistic update on failure
      fetchReactions(messages.map((m) => m.id).filter((id) => !id.startsWith("temp-")));
      toast.error(t("chat.reactionsUnavailable"));
    }
  };

  // --- Message Delete (soft) ---
  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    // Optimistically remove the message immediately so it can't reappear from a realtime event
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    // Try soft-delete first (set deleted_at)
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", messageId)
      .eq("sender_id", user.id);
    if (error) {
      // deleted_at column may not exist — fall back to hard delete
      const { error: hardError } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user.id);
      if (hardError) {
        // Restore message on failure by re-fetching
        fetchMessages();
        toast.error(t("chat.failedDeleteMsg"));
        return;
      }
      toast.success(t("chat.messageDeleted"));
      return;
    }
    toast.success(t("chat.messageDeleted"));
  };

  // --- Message Search ---
  const handleSearchMessages = useCallback(
    async (query: string) => {
      if (!matchId || !query.trim()) {
        setMessageSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("match_id", matchId)
        .ilike("content", `%${query.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      setMessageSearchResults((data || []) as Message[]);
    },
    [matchId]
  );

  // Load reactions when messages change
  // Only re-fetch reactions when the set of real (non-optimistic) message IDs changes.
  // Using a ref to track the previous key avoids firing on every optimistic insert.
  useEffect(() => {
    const ids = messages.map((m) => m.id).filter((id) => !id.startsWith("temp-"));
    const key = ids.join(",");
    if (ids.length > 0 && key !== prevReactionIdsRef.current) {
      prevReactionIdsRef.current = key;
      fetchReactions(ids);
    }
  }, [messages, fetchReactions]);

  // --- GIF search via Tenor ---
  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifResults([]);
      return;
    }
    setSearchingGifs(true);
    try {
      // Using Tenor v2 search
      const tenorKey = import.meta.env.VITE_TENOR_API_KEY || "";
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&limit=20&key=${tenorKey}`
      );
      const data = await res.json();
      setGifResults(
        (data.results || []).map(
          (r: {
            id: string;
            media_formats: { tinygif?: { url: string }; gif?: { url: string } };
          }) => ({
            id: r.id,
            url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || "",
            preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || "",
          })
        )
      );
    } catch {
      setGifResults([]);
    } finally {
      setSearchingGifs(false);
    }
  };

  const sendGifMessage = async (gifUrl: string) => {
    if (!user || !matchId) return;
    setShowGifPicker(false);
    setGifSearchQuery("");
    setGifResults([]);
    // Optimistic
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      content: "",
      image_url: gifUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const data = await insertMessageWithFallback({
        match_id: matchId,
        sender_id: user.id,
        receiver_id: otherUserId || null,
        content: "[GIF]",
        image_url: gifUrl,
      });
      if (data) {
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticMessage.id);
          if (withoutOptimistic.some((m) => m.id === data.id)) return withoutOptimistic;
          return [...withoutOptimistic, data];
        });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      toast.error(t("chat.failedGif"));
    }
  };

  const handleUnmatch = async () => {
    if (!user || !matchId) return;

    try {
      // First get the match to find the other user's ID
      const { data: matchData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (!matchData) throw new Error("Match not found");

      const otherUserId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id;

      // Delete the match
      const { error: matchError } = await supabase.from("matches").delete().eq("id", matchId);

      if (matchError) throw matchError;

      // Remove both likes (clean slate)
      await supabase
        .from("likes")
        .delete()
        .or(
          `and(liker_id.eq.${user.id},liked_id.eq.${otherUserId}),and(liker_id.eq.${otherUserId},liked_id.eq.${user.id})`
        );

      toast.success(`Unmatched with ${matchProfile?.full_name || "user"}`);
      navigate("/matches");
    } catch (error) {
      logger.error("Error removing match:", error);
      toast.error(t("chat.failedUnmatch"));
    } finally {
      setShowUnmatchDialog(false);
    }
  };

  // Block / Unblock actions
  const handleBlock = async () => {
    if (!user || !otherUserId) return;
    try {
      await blockUserApi(user.id, otherUserId);
      setBlockedByYou(true);
      toast.success(t("chat.userBlocked"));
    } catch (e) {
      logger.error(e);
      toast.error(t("chat.failedBlock"));
    }
  };

  const handleUnblock = async () => {
    if (!user || !otherUserId) return;
    try {
      await unblockUserApi(user.id, otherUserId);
      setBlockedByYou(false);
      toast.success(t("chat.userUnblocked"));
    } catch (e) {
      logger.error(e);
      toast.error(t("chat.failedUnblock"));
    }
  };

  useEffect(() => {
    if (!user || !matchId) {
      navigate("/auth");
      return;
    }

    const draft = searchParams.get("draft");
    if (draft) {
      setNewMessage(draft);
      setShowIcebreakers(false);
    }

    fetchMatchProfile();
    fetchMessages();
    markMessagesRead();

    // Load chat streak
    if (user) {
      const raw = localStorage.getItem(`match_streak_${user.id}`);
      if (raw) {
        try {
          setChatStreak(JSON.parse(raw).streak || 0);
        } catch {
          /* ignore */
        }
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, matchId]);

  // Fetch stories for the matched user
  useEffect(() => {
    if (!otherUserId) return;
    const now = new Date().toISOString();
    supabase
      .from("stories")
      .select("id, media_type, media_url, caption, created_at")
      .eq("user_id", otherUserId)
      .gt("expires_at", now)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMatchStories((data as MatchStory[]) || []);
      });
  }, [otherUserId]);

  // Subscribe to new messages for this specific match
  useEffect(() => {
    if (!user || !matchId) return;

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          logger.log("📩 New message received:", payload);
          const newMessage = payload.new as Message;

          // Skip soft-deleted messages
          if (newMessage.deleted_at) return;

          // Only add if not already in the list (avoid duplicates)
          setMessages((prev) => {
            // Check if this message already exists (by ID or by content+timestamp for optimistic updates)
            const exists = prev.some(
              (msg) =>
                msg.id === newMessage.id ||
                (msg.sender_id === newMessage.sender_id &&
                  msg.content === newMessage.content &&
                  Math.abs(
                    new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()
                  ) < 2000)
            );

            if (exists) {
              logger.log("⏭️ Message already exists, skipping");
              return prev;
            }

            logger.log("✅ Adding new message to list");

            // Play incoming message sound if it's from the other person
            if (newMessage.sender_id !== user?.id) {
              receivedSound.play().catch(() => {
                // Ignore if audio fails to play
              });
              markMessagesRead();
            }

            return [...prev, newMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          if (updated.deleted_at) {
            setMessages((prev) => prev.filter((msg) => msg.id !== updated.id));
          } else {
            // Merge the incoming update but preserve any local deleted_at we already set
            // to prevent a stale realtime event from un-deleting a message
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== updated.id) return msg;
                if (msg.deleted_at) return msg; // already marked deleted locally — keep it
                return { ...msg, ...updated };
              })
            );
          }
        }
      )
      .subscribe((status) => {
        logger.log("💬 Messages subscription status:", status);
      });

    const typingChannel = supabase
      .channel(`typing:${matchId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== user?.id) {
          setOtherUserTyping(true);
          if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => setOtherUserTyping(false), 2000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== user?.id) {
          setOtherUserTyping(false);
          // Clear any pending typing timeout to prevent it from re-setting to true
          if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      logger.log("🔌 Unsubscribing from messages channel");
      supabase.removeChannel(channel);
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
    };
  }, [user, matchId, navigate, fetchMatchProfile, fetchMessages, markMessagesRead]);

  if (loading) {
    return (
      <div className="h-dvh flex flex-col overflow-hidden bg-gradient-subtle">
        <div className="flex-1 p-4">
          <div className="container mx-auto max-w-2xl space-y-4">
            <MessageSkeleton />
            <MessageSkeleton isOwn />
            <MessageSkeleton />
            <MessageSkeleton isOwn />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden pb-24 page-bg">
      {/* Header */}
      <ChatHeader
        matchProfile={matchProfile}
        chatStreak={chatStreak}
        otherUserTyping={otherUserTyping}
        otherUserLastActive={otherUserLastActive}
        blockedByYou={blockedByYou}
        blockedYou={blockedYou}
        showMessageSearch={showMessageSearch}
        onBack={() => navigate("/matches")}
        onProfileClick={() => setShowProfileDialog(true)}
        onSearchToggle={() => {
          setShowMessageSearch(!showMessageSearch);
          setMessageSearchQuery("");
          setMessageSearchResults([]);
        }}
        onVoiceCall={startVoiceCall}
        onVideoCall={startVideoCall}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onUnmatch={() => setShowUnmatchDialog(true)}
        onReport={() => setShowReportDialog(true)}
      />

      {/* Message Search Bar */}
      {showMessageSearch && (
        <div className="border-b border-border bg-card px-4 py-2">
          <div className="container mx-auto max-w-2xl flex gap-2 items-center">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={messageSearchQuery}
              onChange={(e) => {
                setMessageSearchQuery(e.target.value);
                handleSearchMessages(e.target.value);
              }}
              placeholder={t("chat.searchMessagesPlaceholder")}
              className="flex-1 h-8 text-sm bg-card border-border"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setShowMessageSearch(false);
                setMessageSearchQuery("");
                setMessageSearchResults([]);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {messageSearchResults.length > 0 && (
            <div className="container mx-auto max-w-2xl mt-2 max-h-40 overflow-y-auto space-y-1">
              {messageSearchResults.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left p-2 rounded hover:bg-muted text-sm truncate"
                  onClick={() => {
                    const el = document.getElementById(`msg-${r.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("ring-2", "ring-primary");
                      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
                    }
                    setShowMessageSearch(false);
                  }}
                >
                  <span className="text-muted-foreground text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>{" "}
                  {sanitizeText(r.content || "")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 scroll-momentum"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop < 80 && hasOlderMessages && !loadingOlder) {
            loadOlderMessages();
          }
        }}
      >
        <div className="container mx-auto max-w-2xl space-y-4 relative z-10">
          {/* Load older messages indicator */}
          {loadingOlder && (
            <div className="text-center py-2">
              <span className="text-xs text-muted-foreground animate-pulse">
                {t("common.loading")}
              </span>
            </div>
          )}
          {!hasOlderMessages && messages.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              {t("chat.startConversation")}
            </p>
          )}

          {/* Pinned Date Plan */}
          {confirmedDatePlan && (
            <div
              className={`rounded-xl border-2 p-4 shadow-sm ${
                confirmedDatePlan.status === "confirmed"
                  ? "border-green-400 bg-green-50 dark:bg-green-950/30"
                  : "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-full p-2 ${
                    confirmedDatePlan.status === "confirmed"
                      ? "bg-green-100 dark:bg-green-900/50"
                      : "bg-yellow-100 dark:bg-yellow-900/50"
                  }`}
                >
                  <Pin
                    className={`h-4 w-4 ${
                      confirmedDatePlan.status === "confirmed"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {confirmedDatePlan.status === "confirmed"
                        ? t("chat.dateConfirmedLabel")
                        : t("chat.datePlannedLabel")}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        confirmedDatePlan.status === "confirmed"
                          ? "border-green-400 text-green-700 dark:text-green-400"
                          : "border-yellow-400 text-yellow-700 dark:text-yellow-400"
                      }`}
                    >
                      {confirmedDatePlan.status === "confirmed"
                        ? t("chat.confirmed")
                        : t("chat.pending")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{confirmedDatePlan.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {new Date(confirmedDatePlan.scheduled_for).toLocaleString("sq", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {confirmedDatePlan.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📝 {confirmedDatePlan.notes}
                    </p>
                  )}
                  {user &&
                    confirmedDatePlan.status === "proposed" &&
                    confirmedDatePlan.planner_id !== user.id && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleRespondDatePlan(true)}
                        >
                          ✅ {t("chat.accept")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleRespondDatePlan(false)}
                        >
                          ❌ {t("chat.decline")}
                        </Button>
                      </div>
                    )}
                  {user &&
                    confirmedDatePlan.status !== "canceled" &&
                    confirmedDatePlan.status !== "completed" &&
                    (confirmedDatePlan.planner_id === user.id ||
                      confirmedDatePlan.status === "confirmed") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs h-7 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={handleCancelDatePlan}
                      >
                        <X className="h-3 w-3 mr-1" />
                        {t("chat.cancelPlan")}
                      </Button>
                    )}
                </div>
              </div>
            </div>
          )}

          {(blockedByYou || blockedYou) && (
            <div className="mb-4 p-3 rounded border border-primary text-sm bg-primary/10 text-primary">
              {blockedByYou && !blockedYou && <span>{t("chat.youBlockedUser")}</span>}
              {blockedYou && !blockedByYou && <span>{t("chat.blockedByUser")}</span>}
              {blockedYou && blockedByYou && <span>{t("chat.mutualBlock")}</span>}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-6">
              <p className="text-base font-medium mb-1">{t("chat.noMessages")}</p>
              <p className="text-sm">{t("chat.typeMessage")}</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                matchName={matchProfile?.full_name}
                supportsReadReceipts={supportsReadReceipts}
                reactions={reactions[message.id] || []}
                reactionPickerMsgId={reactionPickerMsgId}
                reactionEmojis={REACTION_EMOJIS}
                replySource={
                  message.reply_to_id
                    ? messages.find((m) => m.id === message.reply_to_id) || null
                    : null
                }
                onToggleReaction={toggleReaction}
                onToggleReactionPicker={(id) =>
                  setReactionPickerMsgId(reactionPickerMsgId === id ? null : id)
                }
                onReply={setReplyingTo}
                onDelete={deleteMessage}
              />
            ))
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        aria-label={t("chat.uploadPhoto")}
        title="Upload photo"
        onChange={handlePhotoSelected}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        className="hidden"
        aria-label={t("chat.takePhoto")}
        title="Take photo"
        onChange={handlePhotoSelected}
      />

      {/* Input */}
      <ChatInput
        newMessage={newMessage}
        onMessageChange={(value) => {
          setNewMessage(value);
          if (value.trim().length > 0) setShowIcebreakers(false);
        }}
        onSubmit={sendMessage}
        onDatePlan={() => setShowDatePlanDialog(true)}
        onPhotoGallery={() => fileInputRef.current?.click()}
        onPhotoCamera={() => cameraInputRef.current?.click()}
        onGifPicker={() => setShowGifPicker(true)}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        audioBlob={audioBlob}
        onSendVoice={sendVoiceMessage}
        onCancelVoice={() => setAudioBlob(null)}
        imagePreview={imagePreview}
        sendingImage={sendingImage}
        onSendPhoto={sendPhotoMessage}
        onClearImage={clearImagePreview}
        blockedByYou={blockedByYou}
        blockedYou={blockedYou}
        showIcebreakers={showIcebreakers}
        messagesEmpty={messages.length === 0}
        icebreakerPrompts={icebreakerPrompts}
        onIcebreakerClick={(prompt) => {
          setNewMessage(prompt);
          setShowIcebreakers(false);
        }}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        matchName={matchProfile?.full_name}
        currentUserId={user?.id}
        onTyping={() => {
          if (typingChannelRef.current && user) {
            typingChannelRef.current.send({
              type: "broadcast",
              event: "typing",
              payload: { userId: user.id },
            });
            if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = window.setTimeout(() => {
              typingChannelRef.current?.send({
                type: "broadcast",
                event: "stop_typing",
                payload: { userId: user.id },
              });
            }, 1200);
          }
        }}
      />

      {/* Unmatch Confirmation Dialog */}
      <AlertDialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.unmatchTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("chat.unmatchDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmatch}
              className="bg-primary hover:bg-primary text-white"
            >
              {t("matches.unmatch")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {user && otherUserId && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedId={otherUserId}
          reportedName={matchProfile?.full_name}
          currentUserId={user.id}
          context="chat"
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
          {!matchProfile && <DialogTitle className="sr-only">{t("common.profile")}</DialogTitle>}
          {matchProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">
                  {sanitizeText(matchProfile.full_name || "")}
                  {matchProfile.age ? `, ${matchProfile.age}` : ""}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Image Carousel */}
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-muted">
                  {matchProfile.profile_images && matchProfile.profile_images.length > 0 ? (
                    <>
                      <img
                        src={
                          matchProfile.profile_images[profileImageIndex] ||
                          matchProfile.profile_image_url ||
                          "/placeholder.svg"
                        }
                        alt={`${matchProfile.full_name} - Photo ${profileImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />

                      {matchProfile.profile_images.length > 1 && (
                        <>
                          {/* Dots moved to top */}
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
                            {matchProfile.profile_images.map((_, idx) => (
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
                                prev === 0 ? matchProfile.profile_images!.length - 1 : prev - 1
                              )
                            }
                            aria-label={t("chat.previousPhoto")}
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full"
                            onClick={() =>
                              setProfileImageIndex((prev) =>
                                prev === matchProfile.profile_images!.length - 1 ? 0 : prev + 1
                              )
                            }
                            aria-label={t("chat.nextPhoto")}
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                        </>
                      )}

                      {/* Info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                            {sanitizeText(matchProfile.full_name || "")}
                          </h3>
                          {matchProfile.age ? (
                            <span className="text-2xl font-light opacity-90">
                              {matchProfile.age}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {matchProfile.verified && (
                            <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                              ✓ Verified
                            </Badge>
                          )}
                          {matchProfile.is_premium && (
                            <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none text-[10px] px-1.5 py-0 h-4">
                              Premium
                            </Badge>
                          )}
                          {matchProfile.video_intro_url && (
                            <Badge className="bg-background/70 text-white border-none text-[10px] px-1.5 py-0 h-4">
                              Video
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium">
                          {matchProfile.travel_mode_active && matchProfile.travel_city ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              <span>✈️</span>
                              <span>
                                {t("common.travelingIn")} {matchProfile.travel_city}
                              </span>
                            </div>
                          ) : matchProfile.city ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              <MapPin className="h-4 w-4" />
                              <span>{matchProfile.city}</span>
                            </div>
                          ) : null}
                          {matchProfile.distance_km && (
                            <div className="backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              {t("chat.kmAway", { km: Math.round(matchProfile.distance_km) })}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={matchProfile.profile_image_url || "/placeholder.svg"}
                        alt={matchProfile.full_name}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                      {/* Info overlay (single image) */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                            {sanitizeText(matchProfile.full_name || "")}
                          </h3>
                          {matchProfile.age ? (
                            <span className="text-2xl font-light opacity-90">
                              {matchProfile.age}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {matchProfile.verified && (
                            <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                              ✓ Verified
                            </Badge>
                          )}
                          {matchProfile.is_premium && (
                            <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none text-[10px] px-1.5 py-0 h-4">
                              Premium
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium">
                          {matchProfile.travel_mode_active && matchProfile.travel_city ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              <span>✈️</span>
                              <span>
                                {t("common.travelingIn")} {matchProfile.travel_city}
                              </span>
                            </div>
                          ) : matchProfile.city ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                              <MapPin className="h-4 w-4" />
                              <span>{matchProfile.city}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Video Intro */}
                {matchProfile.video_intro_url && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {t("common.videoIntro")}
                    </h4>
                    <div className="rounded-lg overflow-hidden border border-primary/20">
                      <video
                        src={matchProfile.video_intro_url}
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
                              alt="Story"
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
                  {matchProfile.work && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                      <p className="font-semibold text-sm text-foreground">{matchProfile.work}</p>
                    </Card>
                  )}
                  {matchProfile.education && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                      <p className="font-semibold text-sm text-foreground">
                        {matchProfile.education}
                      </p>
                    </Card>
                  )}
                  {(matchProfile.height_cm || matchProfile.height) && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                      <p className="font-semibold text-sm text-foreground">
                        {matchProfile.height_cm
                          ? `${matchProfile.height_cm} cm`
                          : matchProfile.height}
                      </p>
                    </Card>
                  )}
                  {matchProfile.zodiac_sign && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                      <p className="font-semibold text-sm text-foreground">
                        {matchProfile.zodiac_sign}
                      </p>
                    </Card>
                  )}
                  {matchProfile.religion && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                      <p className="font-semibold text-sm text-foreground">
                        {matchProfile.religion}
                      </p>
                    </Card>
                  )}
                  {matchProfile.lifestyle && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                      <p className="font-semibold text-sm text-foreground">
                        {matchProfile.lifestyle}
                      </p>
                    </Card>
                  )}
                  {matchProfile.drinking && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                      <p className="font-semibold text-sm text-foreground">
                        {matchProfile.drinking}
                      </p>
                    </Card>
                  )}
                  {matchProfile.smoking && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                      <p className="font-semibold text-sm text-foreground">
                        {matchProfile.smoking}
                      </p>
                    </Card>
                  )}
                  {matchProfile.pets && (
                    <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                      <p className="font-semibold text-sm text-foreground">{matchProfile.pets}</p>
                    </Card>
                  )}
                </div>

                {/* Bio */}
                {matchProfile.bio && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">💬</span> About
                    </h3>
                    <p className="text-foreground leading-relaxed bg-background p-4 rounded-lg">
                      {sanitizeText(matchProfile.bio || "")}
                    </p>
                  </div>
                )}

                {/* Shared Interests */}
                {matchProfile.interests &&
                  matchProfile.interests.length > 0 &&
                  myInterests.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">✨</span> Shared Interests
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {matchProfile.interests
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
                {matchProfile.looking_for && matchProfile.looking_for.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">💕</span> Looking For
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {matchProfile.looking_for.map((item, idx) => (
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
                {matchProfile.interests && matchProfile.interests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">✨</span> Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {matchProfile.interests.map((interest, idx) => (
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
                {matchProfile.soundtrack_url && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">🎵</span> Soundtrack
                    </h3>
                    {matchProfile.soundtrack_title && (
                      <p className="text-sm text-muted-foreground">
                        {matchProfile.soundtrack_title}
                        {matchProfile.soundtrack_artist
                          ? ` — ${matchProfile.soundtrack_artist}`
                          : ""}
                      </p>
                    )}
                    {matchProfile.soundtrack_source === "youtube" &&
                      (() => {
                        const m = matchProfile.soundtrack_url?.match(
                          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
                        );
                        return m ? (
                          <div className="rounded-xl overflow-hidden aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${m[1]}?autoplay=0`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Profile soundtrack"
                            />
                          </div>
                        ) : null;
                      })()}
                    {matchProfile.soundtrack_source === "spotify" &&
                      (() => {
                        const m = matchProfile.soundtrack_url?.match(
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
                              title="Profile soundtrack"
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
                    Close
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white"
                    onClick={() => {
                      setShowProfileDialog(false);
                    }}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Date Plan Dialog */}
      <Dialog open={showDatePlanDialog} onOpenChange={setShowDatePlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Plan a Date
            </DialogTitle>
            <DialogDescription>
              Plan a date with {matchProfile?.full_name}. They'll be notified in chat!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("chat.dateTimeLabel")}</label>
              <Input
                type="datetime-local"
                value={datePlanDateTime}
                onChange={(e) => setDatePlanDateTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("chat.locationLabel")}</label>
              <Input
                placeholder={t("chat.locationHint")}
                value={datePlanLocation}
                onChange={(e) => setDatePlanLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("chat.notesLabel")}</label>
              <Textarea
                placeholder={t("chat.notesHint")}
                value={datePlanNotes}
                onChange={(e) => setDatePlanNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateDatePlan}
              disabled={creatingDatePlan || !datePlanDateTime || !datePlanLocation}
            >
              {creatingDatePlan ? "Creating..." : "📅 Create Date Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Dialog */}
      {user && matchId && matchProfile && otherUserId && (
        <CallDialog
          matchId={matchId}
          matchName={matchProfile.full_name}
          matchImage={matchProfile.profile_image_url || undefined}
          currentUserId={user.id}
          otherUserId={otherUserId}
          callType={callType}
          isOpen={showCallDialog}
          onClose={() => {
            setShowCallDialog(false);
            setIsAnsweringCall(false); // Reset flag when closing
          }}
          isAnswering={isAnsweringCall}
        />
      )}

      {/* Story Viewer Dialog */}
      <Dialog open={showMatchStoryViewer} onOpenChange={setShowMatchStoryViewer}>
        <DialogContent className="max-w-sm p-0 bg-black border-none" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{t("common.storyViewer")}</DialogTitle>
          {matchStories[matchStoryIndex] && (
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
              <button
                className="absolute top-5 left-3 z-10 w-20 rounded-xl overflow-hidden shadow-lg border border-white/20"
                onClick={() => {
                  setShowMatchStoryViewer(false);
                  setShowProfileDialog(true);
                }}
              >
                <div className="relative aspect-[3/4]">
                  <img
                    src={matchProfile?.profile_image_url || "/placeholder.svg"}
                    alt={matchProfile?.full_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 text-white">
                    <p className="text-[10px] font-bold leading-tight truncate drop-shadow">
                      {matchProfile?.full_name}
                      {matchProfile?.age ? `, ${matchProfile.age}` : ""}
                    </p>
                    {matchProfile?.city && (
                      <p className="text-[9px] text-white/80 truncate leading-tight">
                        {matchProfile.city}
                      </p>
                    )}
                  </div>
                  {matchProfile?.verified && (
                    <div className="absolute top-1 right-1 bg-primary rounded-full h-3.5 w-3.5 flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✓</span>
                    </div>
                  )}
                </div>
              </button>
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
                  alt="Story"
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
                  aria-label={t("chat.previousStory")}
                />
                <button
                  className="w-1/2 h-full"
                  onClick={() => {
                    if (matchStoryIndex < matchStories.length - 1)
                      setMatchStoryIndex(matchStoryIndex + 1);
                    else setShowMatchStoryViewer(false);
                  }}
                  aria-label={t("chat.nextStory")}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />

      {/* GIF Picker Dialog */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-card w-full max-w-2xl rounded-t-2xl p-4 max-h-[60vh] flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Input
                placeholder={t("chat.searchGifsPlaceholder")}
                value={gifSearchQuery}
                onChange={(e) => {
                  setGifSearchQuery(e.target.value);
                  searchGifs(e.target.value);
                }}
                autoFocus
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowGifPicker(false);
                  setGifSearchQuery("");
                  setGifResults([]);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="overflow-y-auto flex-1 grid grid-cols-2 gap-2">
              {searchingGifs && (
                <p className="col-span-2 text-center text-muted-foreground py-4">
                  {t("common.searching")}
                </p>
              )}
              {!searchingGifs && gifResults.length === 0 && gifSearchQuery && (
                <p className="col-span-2 text-center text-muted-foreground py-4">
                  {t("chat.noGifsFound")}
                </p>
              )}
              {gifResults.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => sendGifMessage(gif.url)}
                  className="rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                >
                  <img
                    src={gif.preview}
                    alt="GIF"
                    className="w-full h-28 object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {t("chat.poweredByTenor")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
