import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, Ban } from "lucide-react";
import { blockUser as blockUserApi } from "@/lib/blocking";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface IncomingCall {
  sessionId: string;
  callerId: string;
  callerName: string;
  callerImage?: string;
  callType: "voice" | "video";
  matchId: string;
}

interface IncomingCallDialogProps {
  onAccept: (matchId: string, callType: "voice" | "video") => void;
}

export const IncomingCallDialog = ({ onAccept }: IncomingCallDialogProps) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const rejectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    logger.log("🎧 Setting up incoming call listener for user:", user.id);

    const channel = supabase
      .channel(`incoming_calls_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          logger.log("📞 INCOMING CALL EVENT RECEIVED:", payload);
          const session = payload.new;

          // Ignore if not ringing status
          if (session.status !== "ringing") {
            logger.log("⚠️ Ignoring call - status is not ringing:", session.status);
            return;
          }

          logger.log("✅ Call is ringing, fetching caller profile...");

          // Get caller profile
          const { data: callerProfile } = await supabase
            .from("profiles")
            .select("full_name, profile_image_url")
            .eq("id", session.caller_id)
            .single();

          logger.log("👤 Caller profile:", callerProfile);

          if (callerProfile) {
            setIncomingCall({
              sessionId: session.id,
              callerId: session.caller_id,
              callerName: callerProfile.full_name,
              callerImage: callerProfile.profile_image_url,
              callType: session.call_type,
              matchId: session.match_id,
            });
            logger.log("🔔 Incoming call state set!");
          }
        }
      )
      .subscribe((status) => {
        logger.log("📡 Subscription status:", status);
      });

    return () => {
      logger.log("🔌 Cleaning up incoming call listener");
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Decline handler (defined before useEffect that uses it)
  const handleDecline = useCallback(async () => {
    if (!incomingCall) return;

    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    try {
      // Update session status
      await supabase
        .from("call_sessions")
        .update({ status: "declined", ended_at: new Date().toISOString() })
        .eq("id", incomingCall.sessionId);

      // Send end signal
      await supabase.from("call_signals").insert({
        call_session_id: incomingCall.sessionId,
        sender_id: user?.id || "",
        signal_type: "end",
        signal_data: JSON.parse(JSON.stringify({})),
      });
    } catch (err) {
      logger.error("Error declining call:", err);
    }

    setIncomingCall(null);
  }, [incomingCall, user?.id]);

  // Play ringtone when call comes in
  useEffect(() => {
    if (!incomingCall) return;

    const ringtone = new Audio(
      incomingCall.callType === "video" ? "/video-call-ringtone.mp3" : "/voice-call-ringtone.mp3"
    );
    ringtone.loop = true;

    let flashInterval: ReturnType<typeof setInterval> | null = null;
    let vibrateInterval: ReturnType<typeof setInterval> | null = null;

    ringtone.play().catch(() => {
      logger.log("Autoplay blocked, using fallback");
      // Flash title as fallback
      const originalTitle = document.title;
      flashInterval = setInterval(() => {
        document.title = document.title === originalTitle ? "🔔 INCOMING CALL!" : originalTitle;
      }, 500);

      // Vibrate on mobile
      if ("vibrate" in navigator) {
        vibrateInterval = setInterval(() => {
          navigator.vibrate(500);
        }, 1000);
      }

      setTimeout(() => {
        if (flashInterval) clearInterval(flashInterval);
        if (vibrateInterval) clearInterval(vibrateInterval);
        document.title = originalTitle;
      }, 30000);
    });

    ringtoneRef.current = ringtone;

    // Auto-decline after 30 seconds
    rejectTimeoutRef.current = setTimeout(() => {
      handleDecline();
    }, 30000);

    return () => {
      ringtone.pause();
      ringtone.currentTime = 0;
      if (flashInterval) clearInterval(flashInterval);
      if (vibrateInterval) clearInterval(vibrateInterval);
      if (rejectTimeoutRef.current) {
        clearTimeout(rejectTimeoutRef.current);
      }
    };
  }, [incomingCall, handleDecline]);

  const handleAccept = () => {
    if (!incomingCall) return;

    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    // Clear auto-decline timeout
    if (rejectTimeoutRef.current) {
      clearTimeout(rejectTimeoutRef.current);
    }

    // Navigate to chat with autoAnswer
    onAccept(incomingCall.matchId, incomingCall.callType);
    setIncomingCall(null);
  };

  const handleBlock = async () => {
    if (!user || !incomingCall) return;
    try {
      await blockUserApi(user.id, incomingCall.callerId);
    } catch (e) {
      logger.error("Failed to block user on incoming call:", e);
    } finally {
      // Also decline/end the ringing session
      await handleDecline();
    }
  };

  return (
    <Dialog open={!!incomingCall} onOpenChange={() => handleDecline()}>
      <DialogContent className="sm:max-w-[400px] bg-[hsl(345,25%,20%)] text-white border-[hsl(345,70%,55%)]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(25,85%,70%)] text-center">
            {t("incomingCall.incoming")} {incomingCall?.callType === "video" ? t("incomingCall.video") : t("incomingCall.voice")} {t("incomingCall.call")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center">
            {t("incomingCall.from")} {incomingCall?.callerName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Caller image */}
          {incomingCall?.callerImage ? (
            <img
              src={incomingCall.callerImage}
              alt={incomingCall.callerName}
              className="w-32 h-32 rounded-full object-cover border-4 border-[hsl(345,70%,55%)] animate-pulse"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(345,70%,55%)] to-[hsl(25,85%,70%)] flex items-center justify-center animate-pulse">
              <span className="text-5xl">{incomingCall?.callerName?.[0]}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-6">
            <Button
              size="icon"
              className="rounded-full h-16 w-16 bg-red-700 hover:bg-red-800"
              onClick={handleBlock}
              title="Block caller"
            >
              <Ban className="h-8 w-8" />
            </Button>
            <Button
              size="icon"
              className="rounded-full h-16 w-16 bg-red-600 hover:bg-red-700"
              onClick={handleDecline}
            >
              <PhoneOff className="h-8 w-8" />
            </Button>

            <Button
              size="icon"
              className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
            >
              {incomingCall?.callType === "video" ? (
                <Video className="h-8 w-8" />
              ) : (
                <Phone className="h-8 w-8" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
