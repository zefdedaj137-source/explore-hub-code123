import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, MoreVertical, UserX, Mic, Phone, Video, Square, Ban, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { CallDialog } from "@/components/CallDialog";
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
import { z } from "zod";
import { isBlockedBetween, blockUser as blockUserApi, unblockUser as unblockUserApi } from "@/lib/blocking";

import { LoadingSpinner, MessageSkeleton } from "@/components/LoadingSkeleton";

const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(1000, { message: "Message must be less than 1000 characters" })
});

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  voice_url?: string;
}

interface MatchProfile {
  full_name: string;
  profile_image_url: string | null;
}

const Chat = () => {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [matchProfile, setMatchProfile] = useState<MatchProfile | null>(null);
  const [specialMatchType, setSpecialMatchType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Premium and user IDs
  const [isPremium, setIsPremium] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string>("");
  const [blockedByYou, setBlockedByYou] = useState(false);
  const [blockedYou, setBlockedYou] = useState(false);
  
  // Voice message states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Call states
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [isAnsweringCall, setIsAnsweringCall] = useState(false);
  const autoAnsweredRef = useRef(false);

  // Auto-answer incoming call
  useEffect(() => {
    const autoAnswerType = searchParams.get('autoAnswer');
    if (autoAnswerType && (autoAnswerType === 'voice' || autoAnswerType === 'video') && !autoAnsweredRef.current) {
      console.log('🎯 Auto-answering call:', autoAnswerType);
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
      if (searchParams.get('autoAnswer')) {
        navigate(`/chat/${matchId}`, { replace: true });
      }
    }
  }, [showCallDialog, matchId, navigate, searchParams]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start voice recording
  const startRecording = async () => {
    try {
      if (blockedByYou) {
        toast.error("You blocked this user. Unblock to send voice messages.");
        return;
      }
      if (blockedYou) {
        toast.error("This user has blocked you. You cannot send voice messages.");
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording voice message...");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone");
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Voice message recorded!");
    }
  };

  // Send voice message
  const sendVoiceMessage = async () => {
    if (!audioBlob || !user || !matchId) return;
    if (blockedByYou || blockedYou) return;

    try {
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-voice-${Date.now()}`,
        sender_id: user.id,
        content: `[Voice Message]`,
        created_at: new Date().toISOString(),
        voice_url: URL.createObjectURL(audioBlob), // Temporary local URL
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setAudioBlob(null);

      // Upload audio to Supabase Storage
      const fileName = `voice-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(`${user.id}/${fileName}`, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(uploadData.path);

      // Save message with voice URL
      const { data, error } = await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: user.id,
        content: `[Voice Message]`,
        voice_url: urlData.publicUrl,
      }).select().single();

      if (error) throw error;
      
      // Replace optimistic message with real one from database
      if (data) {
        setMessages(prev => {
          // Remove the optimistic message
          const withoutOptimistic = prev.filter(msg => msg.id !== optimisticMessage.id);
          
          // Check if real message already exists (might have come via Realtime)
          const realExists = withoutOptimistic.some(msg => msg.id === data.id);
          
          if (realExists) {
            console.log('✅ Real voice message already received via Realtime');
            return withoutOptimistic;
          }
          
          console.log('✅ Replacing optimistic voice message with real one');
          return [...withoutOptimistic, data as Message];
        });
      }
      
      toast.success("Voice message sent!");
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast.error("Failed to send voice message");
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-voice-')));
    }
  };

  // Start voice call
  const startVoiceCall = () => {
    if (!user || !matchId) return;
    if (blockedByYou) {
      toast.error("You blocked this user. Unblock to call.");
      return;
    }
    if (blockedYou) {
      toast.error("This user has blocked you. Calls are disabled.");
      return;
    }
    
    if (!isPremium) {
      toast.error("Voice calls are only available for premium members", {
        action: {
          label: "Upgrade",
          onClick: () => navigate("/premium"),
        },
      });
      return;
    }
    
    setCallType("voice");
    setIsAnsweringCall(false); // Initiating new call
    setShowCallDialog(true);
  };

  // Start video call
  const startVideoCall = () => {
    if (!user || !matchId) return;
    if (blockedByYou) {
      toast.error("You blocked this user. Unblock to call.");
      return;
    }
    if (blockedYou) {
      toast.error("This user has blocked you. Calls are disabled.");
      return;
    }
    
    if (!isPremium) {
      toast.error("Video calls are only available for premium members", {
        action: {
          label: "Upgrade",
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

    try {
      // Get match details
      const { data: matchData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (!matchData) throw new Error("Match not found");

      // Set special match type for premium roses background (will work after migration)
      setSpecialMatchType(null); // TODO: Uncomment after migration: matchData.special_match_type || null

      const otherId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id;
      setOtherUserId(otherId);

      // Get other user's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, profile_image_url")
        .eq("id", otherId)
        .single();

      setMatchProfile(profileData);
      
      // Check if current user is premium
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();
        
  setIsPremium(currentUserProfile?.is_premium || false);

  // Check blocking state
  const blockState = await isBlockedBetween(user.id, otherId);
  setBlockedByYou(blockState.blockedByYou);
  setBlockedYou(blockState.blockedYou);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load profile");
    }
  }, [user, matchId]);

  const fetchMessages = useCallback(async () => {
    if (!matchId) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !matchId) return;
    if (blockedByYou) {
      toast.error("You blocked this user. Unblock to send messages.");
      return;
    }
    if (blockedYou) {
      toast.error("This user has blocked you. You cannot send messages.");
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
      
      // Optimistic UI update - add message immediately
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        content: messageContent,
        created_at: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");

      // Play sent message sound
      const sentSound = new Audio('/message-sent.mp3');
      sentSound.volume = 0.5;
      sentSound.play().catch(() => {
        // Ignore if audio fails to play (user interaction required)
      });

      const { data, error } = await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: user.id,
        content: messageContent,
      }).select().single();

      if (error) throw error;
      
      // Replace optimistic message with real one from database
      if (data) {
        setMessages(prev => {
          // Remove the optimistic message and add the real one
          const withoutOptimistic = prev.filter(msg => msg.id !== optimisticMessage.id);
          
          // Check if real message already exists (might have come via Realtime)
          const realExists = withoutOptimistic.some(msg => msg.id === data.id);
          
          if (realExists) {
            console.log('✅ Real message already received via Realtime');
            return withoutOptimistic;
          }
          
          console.log('✅ Replacing optimistic message with real one');
          return [...withoutOptimistic, data as Message];
        });
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to send message");
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
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
      const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (matchError) throw matchError;

      // Remove both likes (clean slate)
      await supabase
        .from("likes")
        .delete()
        .or(`and(liker_id.eq.${user.id},liked_id.eq.${otherUserId}),and(liker_id.eq.${otherUserId},liked_id.eq.${user.id})`);

      toast.success(`Unmatched with ${matchProfile?.full_name || 'user'}`);
      navigate("/matches");
    } catch (error) {
      console.error("Error removing match:", error);
      toast.error("Failed to unmatch");
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
      toast.success("User blocked. You won't receive calls or messages.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to block user");
    }
  };

  const handleUnblock = async () => {
    if (!user || !otherUserId) return;
    try {
      await unblockUserApi(user.id, otherUserId);
      setBlockedByYou(false);
      toast.success("User unblocked.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to unblock user");
    }
  };

  useEffect(() => {
    if (!user || !matchId) {
      navigate("/auth");
      return;
    }

    fetchMatchProfile();
    fetchMessages();
    
    // Subscribe to new messages for this specific match
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('📩 New message received:', payload);
          const newMessage = payload.new as Message;
          
          // Only add if not already in the list (avoid duplicates)
          setMessages((prev) => {
            // Check if this message already exists (by ID or by content+timestamp for optimistic updates)
            const exists = prev.some(msg => 
              msg.id === newMessage.id || 
              (msg.sender_id === newMessage.sender_id && 
               msg.content === newMessage.content && 
               Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 2000)
            );
            
            if (exists) {
              console.log('⏭️ Message already exists, skipping');
              return prev;
            }
            
            console.log('✅ Adding new message to list');
            
            // Play incoming message sound if it's from the other person
            if (newMessage.sender_id !== user?.id) {
              const incomingSound = new Audio('/message-received.mp3');
              incomingSound.volume = 0.6;
              incomingSound.play().catch(() => {
                // Ignore if audio fails to play
              });
            }
            
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('💬 Messages subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from messages channel');
      supabase.removeChannel(channel);
    };
  }, [user, matchId, navigate, fetchMatchProfile, fetchMessages]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-subtle">
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
    <div className="min-h-screen bg-black flex flex-col pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 p-4">
        <div className="container mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/matches")}
              className="hover:bg-gray-700/50 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-yellow-500" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                {matchProfile?.profile_image_url ? (
                  <img
                    src={matchProfile.profile_image_url}
                    alt={`${matchProfile.full_name}'s profile`}
                    loading="lazy"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center">
                    <span className="text-lg font-serif text-white">
                      {matchProfile?.full_name[0]}
                    </span>
                  </div>
                )}
                {blockedByYou && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <X className="h-8 w-8 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                  </div>
                )}
              </div>
              <h1 className="font-serif text-xl font-bold text-white">{matchProfile?.full_name}</h1>
            </div>
          </div>
          
          {/* Call Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={startVoiceCall}
              disabled={blockedByYou || blockedYou}
              className="hover:bg-green-500/20 hover:text-green-500 text-gray-400 rounded-full"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={startVideoCall}
              disabled={blockedByYou || blockedYou}
              className="hover:bg-blue-500/20 hover:text-blue-500 text-gray-400 rounded-full"
            >
              <Video className="h-5 w-5" />
            </Button>
            
            {/* Chat Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-gray-700/50 text-gray-400 rounded-full">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                {!blockedByYou ? (
                  <DropdownMenuItem onClick={handleBlock} className="text-red-600 focus:text-red-600 focus:bg-gray-800">
                    <Ban className="h-4 w-4 mr-2" />
                    Block user
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleUnblock} className="text-green-600 focus:text-green-600 focus:bg-gray-800">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Unblock user
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setShowUnmatchDialog(true)}
                  className="text-red-600 focus:text-red-600 focus:bg-gray-800"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Unmatch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-black">
        <div className="container mx-auto max-w-2xl space-y-4 relative z-10">
          {(blockedByYou || blockedYou) && (
            <div className="mb-4 p-3 rounded border border-yellow-700 text-sm bg-yellow-900/30 text-yellow-200">
              {blockedByYou && !blockedYou && (
                <span>You blocked this user. You won't receive messages or calls. Unblock to continue.</span>
              )}
              {blockedYou && !blockedByYou && (
                <span>This user has blocked you. You cannot message or call.</span>
              )}
              {blockedYou && blockedByYou && (
                <span>You both blocked each other. Communication is disabled.</span>
              )}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>No messages yet. Say hi! 👋</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[70%] p-4 ${
                    message.sender_id === user?.id
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-900 border-gray-800 text-white"
                  }`}
                >
                  {message.voice_url ? (
                    /* Voice message player */
                    <div className="flex items-center gap-3">
                      <Mic className="h-5 w-5" />
                      <audio 
                        controls 
                        className="max-w-full h-8"
                      >
                        <source src={message.voice_url} type="audio/webm" />
                        <source src={message.voice_url} type="audio/mp4" />
                        Your browser doesn't support audio playback.
                      </audio>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p className={`text-xs mt-2 ${message.sender_id === user?.id ? "text-black/70" : "text-gray-400"}`}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Card>
              </div>
            ))
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-black border-t border-gray-800 p-4 z-10">
        {audioBlob ? (
          /* Voice message preview */
          <div className="container mx-auto max-w-2xl flex gap-2 items-center">
            <div className="flex-1 bg-gray-900 rounded-lg p-3 flex items-center gap-2">
              <Mic className="h-5 w-5 text-green-500" />
              <span className="text-sm text-white">Voice message recorded</span>
            </div>
            <Button
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
              onClick={() => setAudioBlob(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={sendVoiceMessage}
              className="bg-yellow-500 text-black hover:bg-yellow-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="container mx-auto max-w-2xl flex gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? "animate-pulse" : "border-gray-700 text-white hover:bg-gray-800"}
              disabled={blockedByYou || blockedYou}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={blockedByYou ? "You've blocked this user" : blockedYou ? "You can't message this user" : "Type a message..."}
              className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
              disabled={isRecording || blockedByYou || blockedYou}
            />
            <Button
              type="submit"
              className="bg-yellow-500 text-black hover:bg-yellow-600"
              disabled={!newMessage.trim() || isRecording || blockedByYou || blockedYou}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        )}
      </div>

      {/* Unmatch Confirmation Dialog */}
      <AlertDialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmatch with {matchProfile?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will no longer be able to message each other, 
              and this conversation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmatch}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Unmatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <BottomNav />
    </div>
  );
};

export default Chat;
