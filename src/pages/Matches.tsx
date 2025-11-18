import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, ArrowLeft, MoreHorizontal, UserX, MessageCircle, Users, Settings, Crown, MapPin, Navigation, User, Search, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { MatchCardSkeleton } from "@/components/LoadingSkeleton";

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
  };
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
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

interface InstantMessageConversation {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_sender: boolean;
}

// Helper function to format message timestamp
const formatMessageTime = (timestamp: string | null | undefined) => {
  if (!timestamp) {
    console.warn("⚠️ Empty timestamp received");
    return 'Just now';
  }
  
  const date = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn("⚠️ Invalid timestamp:", timestamp);
    return 'Just now';
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [instantMessages, setInstantMessages] = useState<InstantMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [instantMessagesLoading, setInstantMessagesLoading] = useState(false);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
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
  const [conversationMessages, setConversationMessages] = useState<InstantMessageConversation[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [blockedByYouSet, setBlockedByYouSet] = useState<Set<string>>(new Set());

  // Fetch list of users you have blocked to render overlays
  const fetchBlockedByYou = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      if (error) {
        console.warn("Failed to fetch blocked users:", error);
        return;
      }
      const ids = new Set<string>((data || []).map((r) => r.blocked_id));
      setBlockedByYouSet(ids);
    } catch (e) {
      console.warn("Exception fetching blocked users:", e);
    }
  }, [user]);

  const fetchInstantMessages = useCallback(async () => {
    if (!user) return;

    setInstantMessagesLoading(true);
    try {
      console.log("🔄 Fetching instant messages for user:", user.id);
      
      const { data, error } = await supabase.rpc("get_instant_messages", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("❌ Error fetching instant messages:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast.error(`Failed to load instant messages: ${error.message}`);
        return;
      }

      console.log("✅ Instant messages loaded:", data);
      setInstantMessages(data || []);
    } catch (error) {
      console.error("❌ Exception fetching instant messages:", error);
      toast.error("Failed to load instant messages");
    } finally {
      setInstantMessagesLoading(false);
    }
  }, [user]);

  const fetchMatches = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch actual matches from the matches table
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select(`
          id,
          user1_id,
          user2_id,
          created_at
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      const matchesWithProfiles = await Promise.all(
        (matchesData || []).map(async (match) => {
          // Get the other user's ID (not current user)
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, age, profile_image_url, profile_images, bio, city, country, location, interests, zodiac_sign, religion, work, education, height, height_cm")
            .eq("id", otherUserId)
            .single();

          // Get last message for this match
          const { data: lastMessageData } = await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: match.id,
            special_match_type: null, // Will be populated after migration
            profile: profile || {
              id: otherUserId,
              full_name: "Unknown User",
              age: 0,
              location: "",
              profile_image_url: null,
              bio: null,
              city: null
            },
            lastMessage: lastMessageData || null
          };
        })
      );

      // Sort by last message time (most recent first)
      const sortedMatches = matchesWithProfiles.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setMatches(sortedMatches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast.error("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleUnmatch = async (match: Match) => {
    if (!user) return;

    try {
      // Delete the match
      const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("id", match.id);

      if (matchError) throw matchError;

      // Remove both likes (clean slate)
      await supabase
        .from("likes")
        .delete()
        .or(`and(liker_id.eq.${user.id},liked_id.eq.${match.profile.id}),and(liker_id.eq.${match.profile.id},liked_id.eq.${user.id})`);

      // Remove the match from local state
      setMatches(prev => prev.filter(m => m.id !== match.id));
      toast.success(`Unmatched with ${match.profile.full_name}`);
    } catch (error) {
      console.error("Error removing match:", error);
      toast.error("Failed to unmatch");
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
      const { error: likeError } = await supabase
        .from("likes")
        .insert({
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
        console.error("Error checking for mutual like:", checkError);
      }

      if (existingLike) {
        // It's a match! Create a match record
        const { error: matchError } = await supabase
          .from("matches")
          .insert({
            user1_id: user.id < profileId ? user.id : profileId,
            user2_id: user.id < profileId ? profileId : user.id,
          });

        if (matchError) {
          console.error("Error creating match:", matchError);
        } else {
          // Delete all instant message messages between these users
          const { error: deleteError } = await supabase
            .from("messages")
            .delete()
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${user.id})`);

          if (deleteError) {
            console.error("Error deleting instant message messages:", deleteError);
          }

          toast.success("🎉 It's a Match! You can now chat with them!");
          // Refresh matches list
          await fetchMatches();
        }
      } else {
        toast.success("Like sent! 💕");
      }

      setShowProfileDialog(false);
      // Refresh instant messages to remove if matched
      await fetchInstantMessages();
    } catch (error) {
      console.error("Error liking profile:", error);
      toast.error("Failed to send like");
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
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
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
        console.error("Error fetching conversation:", error);
        toast.error("Failed to load conversation");
        return;
      }

      console.log("📨 Conversation messages loaded:", data);
      setConversationMessages(data || []);

      // Mark messages as read (messages from the other user to current user)
      const { error: markReadError } = await supabase.rpc("mark_instant_message_as_read", {
        p_sender_id: otherUserId,
        p_receiver_id: user!.id,
      });

      if (markReadError) {
        console.error("Error marking messages as read:", markReadError);
      } else {
        // Refresh instant messages to update unread count
        await fetchInstantMessages();
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessageInConversation = async () => {
    if (!user || !viewingConversation || !replyMessage.trim()) return;

    // Check if user has reached the message limit (20 messages per user)
    const userMessageCount = conversationMessages.filter(msg => msg.is_sender).length;
    if (userMessageCount >= 20) {
      toast.error("Message limit reached! Like their profile to unlock unlimited messaging.");
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
        console.error("❌ Error sending message:", error);
        toast.error(`Failed to send: ${error.message}`);
        return;
      }

      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        toast.error(result.error || "Failed to send message");
        return;
      }

      // Clear input and reload messages
      setReplyMessage("");
      await viewInstantMessageConversation(viewingConversation);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSendingReply(false);
    }
  };

  const sendReplyToInstantMessage = async () => {
    if (!user || !replyingToMessage || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      console.log("🔄 Sending reply to instant message:", {
        sender_user_id: user.id,
        receiver_user_id: replyingToMessage.is_sender ? replyingToMessage.receiver_id : replyingToMessage.sender_id,
        message_text: replyMessage.trim(),
      });

      // Send reply using the reply_to_instant_message function (FREE for receiver)
      const { data, error } = await supabase.rpc("reply_to_instant_message", {
        sender_user_id: user.id,
        receiver_user_id: replyingToMessage.is_sender ? replyingToMessage.receiver_id : replyingToMessage.sender_id,
        message_text: replyMessage.trim(),
      });

      if (error) {
        console.error("❌ Supabase error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast.error(`Failed to send reply: ${error.message}`);
        return;
      }

      console.log("✅ Reply response:", data);

      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        console.error("❌ Reply failed:", result.error);
        toast.error(result.error || "Failed to send reply");
        return;
      }

      console.log("🎉 Reply sent successfully!", result);

      toast.success("Reply sent! Keep messaging in Instant Messages tab.");
      
      setShowReplyDialog(false);
      setReplyMessage("");
      setReplyingToMessage(null);
      
      // Refresh instant messages only (no matches update needed)
      fetchInstantMessages();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
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
    
    // Fetch instant messages when tab becomes active
    if (activeTab === "instant") {
      fetchInstantMessages();
    }
  }, [user, navigate, fetchMatches, fetchInstantMessages, fetchBlockedByYou, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Separate matches into those with messages and new matches
  const matchesWithMessages = matches.filter(m => m.lastMessage);
  const newMatches = matches.filter(m => !m.lastMessage);
  // Hide blocked users from New Matches section
  const visibleNewMatches = newMatches.filter(m => !blockedByYouSet.has(m.profile.id));

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700 p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/eagle-logo.png" alt="Shqiponja" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold text-yellow-500 font-serif">Shqiponja</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/discover")}
              className="hover:bg-gray-700/50 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-yellow-500" />
            </Button>
          </div>

          <div className="mb-4">
            <h1 className="font-serif text-2xl font-bold text-white">Matches</h1>
            <p className="text-sm text-gray-400">
              {activeTab === "matches" 
                ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}`
                : `${instantMessages.length} instant ${instantMessages.length === 1 ? "message" : "messages"}`
              }
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-transparent gap-2">
              <TabsTrigger 
                value="matches" 
                className={`flex items-center gap-2 rounded-2xl border transition-all ${
                  activeTab === "matches"
                    ? "bg-yellow-600/20 text-yellow-500 border-yellow-600/50 shadow-lg shadow-yellow-600/20"
                    : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-600"
                }`}
              >
                <Heart className="h-4 w-4" />
                Matches
              </TabsTrigger>
              <TabsTrigger 
                value="instant" 
                className={`flex items-center gap-2 rounded-2xl border transition-all ${
                  activeTab === "instant"
                    ? "bg-yellow-600/20 text-yellow-500 border-yellow-600/50 shadow-lg shadow-yellow-600/20"
                    : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-600"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Instant Messages
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="matches" className="mt-0">
            {matches.length > 0 ? (
              <>
                {/* Search Bar */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search matches..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full rounded-full bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                </div>

            {/* Horizontal Circular Profile Images */}
            <div className="px-4 py-6 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">
                Your Matches
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {matches
                  .filter(match => 
                    match.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
                    onClick={() => viewProfile(match)}
                  >
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-pink-500 group-hover:border-pink-600 transition-all">
                        <AvatarImage 
                          src={match.profile.profile_image_url} 
                          alt={match.profile.full_name}
                        />
                        <AvatarFallback className="bg-gradient-primary text-white text-xl font-semibold">
                          {match.profile.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {blockedByYouSet.has(match.profile.id) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                        </div>
                      )}
                      {match.lastMessage && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className="text-xs font-medium max-w-[70px] truncate">
                      {match.profile.full_name.split(' ')[0]}
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
                  <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">
                    Messages
                  </h2>
                  {matchesWithMessages
                    .filter(match => 
                      match.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((match) => (
                    <Card
                      key={match.id}
                      className="p-4 hover:shadow-md transition-all cursor-pointer relative group bg-gray-900 border-gray-800"
                      onClick={() => {
                        console.log('📨 Opening chat with match:', match.id);
                        navigate(`/chat/${match.id}`);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-14 w-14">
                            <AvatarImage 
                              src={match.profile.profile_image_url} 
                              alt={match.profile.full_name}
                            />
                            <AvatarFallback className="bg-gradient-primary text-white text-lg font-semibold">
                              {match.profile.full_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          {blockedByYouSet.has(match.profile.id) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-base truncate text-white">
                              {match.profile.full_name}, {match.profile.age}
                            </h3>
                            {match.lastMessage && (
                              <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                {formatMessageTime(match.lastMessage.created_at)}
                              </span>
                            )}
                          </div>
                          {match.lastMessage && (
                            <p className="text-sm text-gray-300 truncate">
                              {match.lastMessage.sender_id === user?.id ? "You: " : ""}
                              {match.lastMessage.content}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black border-0 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('💬 Opening chat with:', match.profile.full_name, 'ID:', match.id);
                              navigate(`/chat/${match.id}`);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Open Chat
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
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmUnmatch(match);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Unmatch
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
                  <h2 className="text-sm font-semibold text-gray-400 mt-8 mb-4 uppercase tracking-wide">
                    New Matches
                  </h2>
                  {visibleNewMatches
                    .filter(match => 
                      match.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((match) => (
                    <Card
                      key={match.id}
                      className="p-4 hover:shadow-md transition-all cursor-pointer relative group bg-gray-900 border-gray-800"
                      onClick={() => {
                        console.log('📨 Opening chat with new match:', match.id);
                        navigate(`/chat/${match.id}`);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-14 w-14">
                            <AvatarImage 
                              src={match.profile.profile_image_url} 
                              alt={match.profile.full_name}
                            />
                            <AvatarFallback className="bg-gradient-primary text-white text-lg font-semibold">
                              {match.profile.full_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          {blockedByYouSet.has(match.profile.id) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-base truncate text-white">
                              {match.profile.full_name}, {match.profile.age}
                            </h3>
                            <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-200">
                              New Match
                            </Badge>
                          </div>
                          {blockedByYouSet.has(match.profile.id) ? (
                            <p className="text-sm text-red-600">
                              You blocked this user.
                            </p>
                          ) : (
                            <p className="text-sm text-gray-300">
                              Say hi to {match.profile.full_name.split(' ')[0]}! 👋
                            </p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black border-0 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('💬 Opening chat with NEW match:', match.profile.full_name, 'ID:', match.id);
                              navigate(`/chat/${match.id}`);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Start Chat
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
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmUnmatch(match);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Unmatch
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>

            {/* No Search Results */}
            {searchQuery && 
             matchesWithMessages.filter(m => m.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
             newMatches.filter(m => m.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="px-4 py-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold text-lg mb-1">No matches found</h3>
                <p className="text-sm text-muted-foreground">
                  Try searching for a different name
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="px-4 py-12">
            <Card className="p-12 text-center shadow-elegant">
              <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-serif text-2xl font-bold mb-2">No matches yet</h3>
              <p className="text-muted-foreground mb-6">
                Start swiping to find your perfect match!
              </p>
              <Button
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                onClick={() => navigate("/discover")}
              >
                Start Discovering
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
            ) : instantMessages.length > 0 ? (
              <div className="px-4 py-6">
                <div className="space-y-4">
                  {instantMessages.map((message) => (
                    <Card 
                      key={message.id} 
                      className="p-4 shadow-elegant hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => viewInstantMessageConversation(message)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <Avatar 
                            className="h-16 w-16 border-2 border-cyan-200 cursor-pointer hover:border-cyan-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewInstantMessageProfile(message);
                            }}
                          >
                            <AvatarImage
                              src={message.is_sender ? message.receiver_avatar || undefined : message.sender_avatar || undefined}
                              alt={message.is_sender ? message.receiver_name : message.sender_name}
                            />
                            <AvatarFallback>
                              <User className="h-8 w-8" />
                            </AvatarFallback>
                          </Avatar>
                          {blockedByYouSet.has(message.is_sender ? message.receiver_id : message.sender_id) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 
                                className="font-semibold text-lg cursor-pointer hover:text-cyan-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewInstantMessageProfile(message);
                                }}
                              >
                                {message.is_sender ? message.receiver_name : message.sender_name}
                              </h3>
                              {message.message_count > 1 && (
                                <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-300">
                                  {message.message_count} messages
                                </Badge>
                              )}
                            </div>
                            <Badge variant={message.is_sender ? "default" : "secondary"}>
                              {message.is_sender ? "Sent" : "Received"}
                            </Badge>
                          </div>

                          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-3 rounded-lg mb-2">
                            <p className="text-sm text-gray-700 line-clamp-2">"{message.message_content}"</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.created_at)}
                            </span>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewInstantMessageConversation(message);
                                }}
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                {message.message_count > 1 ? "View Chat" : "Reply"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                  <p className="text-sm text-center text-gray-600">
                    <MessageSquare className="inline h-4 w-4 mb-1" /> Instant messages let you message before matching. Messages stay here until you both like each other!
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 py-12">
                <Card className="p-12 text-center shadow-elegant">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-cyan-500" />
                  <h3 className="font-serif text-2xl font-bold mb-2">No instant messages yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Use instant message credits to message users before matching!
                  </p>
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                    onClick={() => navigate("/discover")}
                  >
                    Start Discovering
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
            <AlertDialogTitle>Unmatch with {selectedMatch?.profile.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will no longer be able to message each other, 
              and this match will be permanently removed from both of your match lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMatch && handleUnmatch(selectedMatch)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Unmatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile View Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewingProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  {viewingProfile.profile.full_name}, {viewingProfile.profile.age}
                </DialogTitle>
                <DialogDescription>
                  View profile details and information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Profile Images Carousel */}
                {viewingProfile.profile.profile_images && viewingProfile.profile.profile_images.length > 0 ? (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {viewingProfile.profile.profile_images.map((image, index) => (
                        <CarouselItem key={index}>
                          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                            <img
                              src={image}
                              alt={`${viewingProfile.profile.full_name} - Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                              {index + 1} / {viewingProfile.profile.profile_images.length}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {viewingProfile.profile.profile_images.length > 1 && (
                      <>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </>
                    )}
                  </Carousel>
                ) : viewingProfile.profile.profile_image_url ? (
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <img
                      src={viewingProfile.profile.profile_image_url}
                      alt={viewingProfile.profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-6xl font-serif text-primary-foreground">
                        {viewingProfile.profile.full_name[0]}
                      </span>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {viewingProfile.profile.city && viewingProfile.profile.country
                      ? `${viewingProfile.profile.city}, ${viewingProfile.profile.country}`
                      : viewingProfile.profile.location}
                  </span>
                </div>

                {/* Bio */}
                {viewingProfile.profile.bio && (
                  <div>
                    <h4 className="font-semibold mb-2">About</h4>
                    <p className="text-muted-foreground">{viewingProfile.profile.bio}</p>
                  </div>
                )}

                {/* Interests */}
                {viewingProfile.profile.interests && viewingProfile.profile.interests.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingProfile.profile.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Info - Systematic Card Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {viewingProfile.profile.work && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                      <p className="font-semibold text-sm text-gray-800">{viewingProfile.profile.work}</p>
                    </Card>
                  )}
                  {viewingProfile.profile.education && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                      <p className="font-semibold text-sm text-gray-800">{viewingProfile.profile.education}</p>
                    </Card>
                  )}
                  {(viewingProfile.profile.height_cm || viewingProfile.profile.height) && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                      <p className="font-semibold text-sm text-gray-800">
                        {viewingProfile.profile.height_cm ? `${viewingProfile.profile.height_cm} cm` : viewingProfile.profile.height}
                      </p>
                    </Card>
                  )}
                  {viewingProfile.profile.zodiac_sign && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                      <p className="font-semibold text-sm text-gray-800">{viewingProfile.profile.zodiac_sign}</p>
                    </Card>
                  )}
                  {viewingProfile.profile.religion && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                      <p className="font-semibold text-sm text-gray-800">{viewingProfile.profile.religion}</p>
                    </Card>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  {isViewingFromInstantMessage ? (
                    <Button
                      className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikeFromInstantChat(viewingProfile.profile.id);
                      }}
                    >
                      <Heart className="h-4 w-4 mr-2 fill-white" />
                      Like
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 bg-gradient-primary text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileDialog(false);
                        navigate(`/chat/${viewingProfile.id}`);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowProfileDialog(false)}
                  >
                    Close
                  </Button>
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
              <MessageSquare className="h-5 w-5 text-cyan-500" />
              Reply to {replyingToMessage?.sender_name}
            </DialogTitle>
            <DialogDescription>
              Send a reply to this instant message
            </DialogDescription>
          </DialogHeader>
          
          {replyingToMessage && (
            <div className="space-y-4">
              {/* Original Message */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Their message:</p>
                <p className="text-sm text-gray-700">"{replyingToMessage.message_content}"</p>
              </div>

              {/* Reply Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">Your Reply (FREE)</label>
                <Textarea
                  placeholder="Write your reply..."
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
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-3 rounded-lg border border-cyan-200">
                <p className="text-xs text-gray-600 text-center">
                  💬 Replying to instant messages is <strong>completely FREE</strong>! After you reply, you can message freely.
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
                  Cancel
                </Button>
                <Button
                  onClick={sendReplyToInstantMessage}
                  disabled={!replyMessage.trim() || sendingReply}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                >
                  {sendingReply ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Reply
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
              <MessageSquare className="h-5 w-5 text-cyan-500" />
              {viewingConversation && (
                <span>Chat with {viewingConversation.is_sender ? viewingConversation.receiver_name : viewingConversation.sender_name}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              View and send messages in this instant message conversation
            </DialogDescription>
          </DialogHeader>
          
          {viewingConversation && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 rounded-lg border border-rose-200">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                ) : conversationMessages.length > 0 ? (
                  conversationMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_sender ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 shadow-md ${
                          msg.is_sender
                            ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 text-white'
                            : 'bg-white border border-rose-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.is_sender ? 'text-rose-100' : 'text-muted-foreground'}`}>
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet
                  </div>
                )}
              </div>

              {/* Info Banner */}
              <div className="mt-3 p-2 bg-gradient-to-br from-rose-100 via-pink-100 to-red-100 rounded-lg border border-rose-300 shadow-sm">
                <p className="text-xs text-rose-800 text-center font-medium">
                  💬 Messages stay here until you both like each other. Then they'll move to regular chat!
                </p>
              </div>

              {/* Message Counter */}
              <div className="mt-2 flex items-center justify-between px-2">
                <p className="text-xs text-gray-600">
                  {conversationMessages.filter(msg => msg.is_sender).length} / 20 messages sent
                </p>
                {conversationMessages.filter(msg => msg.is_sender).length >= 15 && (
                  <p className="text-xs text-rose-600 font-medium">
                    {20 - conversationMessages.filter(msg => msg.is_sender).length} remaining
                  </p>
                )}
              </div>

              {/* Message Input */}
              <div className="mt-2 flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
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
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90 self-end"
                >
                  {sendingReply ? (
                    <>Sending...</>
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex justify-around items-center">
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-white hover:text-pink-400 hover:bg-gray-800"
              onClick={() => navigate("/discover")}
            >
              <Heart className="h-6 w-6 text-pink-500" />
              <span className="text-xs">Discover</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-white hover:text-blue-400 hover:bg-gray-800"
              onClick={() => navigate("/radar")}
            >
              <Navigation className="h-6 w-6 text-blue-400" />
              <span className="text-xs">Radar</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-white hover:text-pink-400 hover:bg-gray-800"
              onClick={() => navigate("/who-liked-you")}
            >
              <Heart className="h-6 w-6 fill-pink-500 text-pink-500" />
              <span className="text-xs">Likes</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-purple-400 hover:text-purple-400 hover:bg-gray-800"
              onClick={() => navigate("/matches")}
            >
              <Users className="h-6 w-6 text-purple-400" />
              <span className="text-xs">Matches</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-white hover:text-green-400 hover:bg-gray-800"
              onClick={() => navigate("/my-profile")}
            >
              <Settings className="h-6 w-6 text-green-400" />
              <span className="text-xs">Profile</span>
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Matches;
