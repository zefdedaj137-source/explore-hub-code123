import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Ban } from "lucide-react";
import { blockUser as blockUserApi } from "@/lib/blocking";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  matchName: string;
  matchImage?: string;
  currentUserId: string;
  otherUserId: string;
  callType: "voice" | "video";
  isAnswering?: boolean;
}

type SignalData = {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type CallSignal = {
  call_session_id: string;
  sender_id: string;
  signal_type: "offer" | "answer" | "ice-candidate" | "end";
  created_at: string;
  signal_data: SignalData;
};

export const CallDialog = ({
  isOpen,
  onClose,
  matchId,
  matchName,
  matchImage,
  currentUserId,
  otherUserId,
  callType,
  isAnswering = false,
}: CallDialogProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  // State
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "active" | "ended">(
    "connecting"
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const outgoingRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const activeSinceRef = useRef<number | null>(null);

  // WebRTC Configuration (STUN + optional TURN via env)
  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL as string | undefined;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
  }
  const rtcConfig: RTCConfiguration = { iceServers };

  // Initialize call when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    logger.log("🚀 Initializing call...", { isAnswering, callType });
    initializeCall();

    // Cleanup on unmount or when dialog closes
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Play outgoing ringtone when initiating call
  useEffect(() => {
    if (!isOpen || isAnswering || callStatus !== "ringing") return;

    const ringtone = new Audio(
      callType === "video" ? "/outgoing-video-call.mp3" : "/outgoing-voice-call.mp3"
    );
    ringtone.loop = true;
    ringtone.play().catch(() => logger.log("Autoplay blocked for ringtone"));
    outgoingRingtoneRef.current = ringtone;

    return () => {
      ringtone.pause();
      ringtone.currentTime = 0;
    };
  }, [isOpen, isAnswering, callStatus, callType]);

  async function initializeCall() {
    try {
      // Reset state for new call
      setCallStatus("connecting");
      setCallDuration(0);
      setIsMuted(false);
      setIsVideoOff(false);

      logger.log("🎤 Getting user media, callType:", callType);
      logger.log("🌐 Browser info:", {
        userAgent: navigator.userAgent,
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
        protocol: window.location.protocol,
        isSecure: window.isSecureContext,
      });

      // Check if getUserMedia is supported.
      // On Capacitor iOS, the capacitor:// scheme is a secure context but
      // navigator.mediaDevices can appear undefined on some iOS versions.
      // Use window.isSecureContext as the primary check, and allow native
      // Capacitor apps to proceed so iOS prompts for mic/camera permission.
      const isCapacitorNative = !!(
        window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
      ).Capacitor?.isNativePlatform?.();
      const isSecureContext =
        window.isSecureContext ||
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.protocol === "capacitor:";

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isCapacitorNative) {
          // iOS requires NSMicrophoneUsageDescription / NSCameraUsageDescription
          // in Info.plist. If mediaDevices is still missing, prompt the user.
          throw new Error(
            "Please allow microphone access for Shqiponja in iOS Settings → Privacy → Microphone"
          );
        }
        throw new Error(
          isSecureContext ? t("callDialog.browserNotSupported") : t("callDialog.httpsRequired")
        );
      }

      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === "video",
      };

      logger.log("📞 Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      logger.log("✅ Got user media:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream;
      }

      // Setup peer connection
      logger.log("🔧 Creating RTCPeerConnection with config:", rtcConfig);
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Prepare a single remote MediaStream and attach it early
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }

      // Add local tracks
      logger.log("➕ Adding local tracks to peer connection...");
      stream.getTracks().forEach((track) => {
        logger.log(`  ➕ Adding ${track.kind} track:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
        pc.addTrack(track, stream);
      });
      logger.log("✅ All local tracks added");

      // Handle remote stream via a single aggregated MediaStream
      pc.ontrack = (event) => {
        const track = event.track;
        logger.log("📺 Received remote track:", track.kind);
        logger.log("🎦 Remote track state:", {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label,
        });
        logger.log("📊 Current call status:", callStatus);
        logger.log("🎥 Stream info (from event):", {
          streamId: event.streams[0]?.id,
          trackCount: event.streams[0]?.getTracks().length,
          audioTracks: event.streams[0]?.getAudioTracks().length,
          videoTracks: event.streams[0]?.getVideoTracks().length,
          allTrackIds: event.streams[0]?.getTracks().map((t) => `${t.kind}:${t.id}`),
        });

        // Ensure we have a remote stream attached to the element
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        if (
          remoteVideoRef.current &&
          remoteVideoRef.current.srcObject !== remoteStreamRef.current
        ) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }

        const attachTrack = () => {
          if (!remoteStreamRef.current) return;
          const already = remoteStreamRef.current.getTracks().some((t) => t.id === track.id);
          if (!already) {
            remoteStreamRef.current.addTrack(track);
            logger.log(`🎯 Added remote ${track.kind} track to aggregated stream`);
          }
          if (remoteVideoRef.current) {
            // Log video element state
            logger.log("📹 Video element (pre-play):", {
              width: remoteVideoRef.current.clientWidth,
              height: remoteVideoRef.current.clientHeight,
              videoWidth: remoteVideoRef.current.videoWidth,
              videoHeight: remoteVideoRef.current.videoHeight,
              paused: remoteVideoRef.current.paused,
              muted: remoteVideoRef.current.muted,
            });

            // Wait for metadata then try play
            remoteVideoRef.current.onloadedmetadata = () => {
              logger.log("📹 Video metadata loaded:", {
                videoWidth: remoteVideoRef.current?.videoWidth,
                videoHeight: remoteVideoRef.current?.videoHeight,
              });
            };

            remoteVideoRef.current
              .play()
              .then(() => {
                logger.log("✅ Remote media playing");
                if (remoteVideoRef.current) {
                  logger.log("📹 After play:", {
                    videoWidth: remoteVideoRef.current.videoWidth,
                    videoHeight: remoteVideoRef.current.videoHeight,
                    paused: remoteVideoRef.current.paused,
                  });
                }
              })
              .catch((err) => {
                logger.error("❌ Error playing remote media:", err);
                setTimeout(() => remoteVideoRef.current?.play().catch((e) => logger.error(e)), 150);
              });
          }
        };

        if (track.muted) {
          logger.log("⏳ Track is muted; waiting for onunmute to attach...");
          track.onunmute = () => {
            logger.log("✅ Track unmuted; attaching now");
            attachTrack();
          };
        } else {
          attachTrack();
        }

        // Re-check dimensions after a short delay
        setTimeout(() => {
          if (remoteVideoRef.current) {
            logger.log("⏱️ Delayed video check:", {
              videoWidth: remoteVideoRef.current.videoWidth,
              videoHeight: remoteVideoRef.current.videoHeight,
            });
          }
        }, 1000);

        // Only update status on first track
        if (callStatus !== "active") {
          activeSinceRef.current = Date.now();
          setCallStatus("active");
          stopOutgoingRingtone();
          startDurationTimer();
        }
      };

      // Handle ICE candidates (sessionId will be set by initiateCall/answerCall)
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          // Use the sessionIdRef to get the current session ID
          const currentSessionId = sessionId || sessionIdRef.current;
          if (!currentSessionId) {
            logger.warn("\u26a0\ufe0f ICE candidate dropped: no session ID yet");
            return;
          }
          logger.log("\ud83e\uddca Sending ICE candidate:", event.candidate.type);
          try {
            await supabase.from("call_signals").insert({
              call_session_id: currentSessionId,
              sender_id: currentUserId,
              signal_type: "ice-candidate",
              signal_data: JSON.parse(JSON.stringify({ candidate: event.candidate.toJSON() })),
            });
          } catch (err) {
            logger.error("Failed to send ICE candidate:", err);
          }
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        logger.log("🧊 ICE connection state:", pc.iceConnectionState);
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        logger.log("🔌 Connection state:", pc.connectionState);
      };

      // Monitor signaling state
      pc.onsignalingstatechange = () => {
        logger.log("📡 Signaling state:", pc.signalingState);
      };

      // First, create/find the session and get the session ID
      if (isAnswering) {
        await answerCall(pc);
      } else {
        await initiateCall(pc);
      }

      // THEN setup signaling channel (now we have sessionId)
      await setupSignalingChannel();
    } catch (error) {
      logger.error("❌ Call initialization error:", error);
      toast({
        title: "Call Failed",
        description: error instanceof Error ? error.message : "Could not initialize call",
        variant: "destructive",
      });
      onClose();
    }
  }

  const initiateCall = async (pc: RTCPeerConnection) => {
    try {
      logger.log("📱 Initiating call...", { matchId, currentUserId, otherUserId, callType });

      // Create call session
      const { data: session, error: sessionError } = await supabase
        .from("call_sessions")
        .insert({
          match_id: matchId,
          caller_id: currentUserId,
          receiver_id: otherUserId,
          call_type: callType,
          status: "ringing",
        })
        .select()
        .single();

      if (sessionError || !session) {
        logger.error("❌ Error creating call session:", sessionError);
        throw sessionError;
      }

      logger.log("✅ Call session created:", session);
      setSessionId(session.id);
      sessionIdRef.current = session.id;

      // Create offer
      logger.log("📝 Creating WebRTC offer...");
      const offer = await pc.createOffer();
      logger.log("📝 Setting local description...");
      await pc.setLocalDescription(offer);
      logger.log("✅ Local description set:", pc.localDescription);

      // Send offer
      logger.log("📤 Sending offer to database...");
      const { error: signalError } = await supabase.from("call_signals").insert({
        call_session_id: session.id,
        sender_id: currentUserId,
        signal_type: "offer",
        signal_data: JSON.parse(JSON.stringify({ offer: pc.localDescription?.toJSON() })),
      });

      if (signalError) {
        logger.error("❌ Error sending offer:", signalError);
        throw signalError;
      }

      logger.log("✅ Offer sent successfully!");
      setCallStatus("ringing");
      logger.log("📞 Call initiated successfully, status set to ringing");
    } catch (error) {
      logger.error("❌ Error initiating call:", error);
      throw error;
    }
  };

  const answerCall = async (pc: RTCPeerConnection) => {
    try {
      // Find active call session
      const { data: sessions } = await supabase
        .from("call_sessions")
        .select("*")
        .eq("match_id", matchId)
        .eq("receiver_id", currentUserId)
        .eq("status", "ringing")
        .order("started_at", { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) {
        throw new Error("No active call found");
      }

      const session = sessions[0];
      setSessionId(session.id);
      sessionIdRef.current = session.id;

      // Get the offer
      const { data: signals } = await supabase
        .from("call_signals")
        .select("*")
        .eq("call_session_id", session.id)
        .eq("signal_type", "offer")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!signals || signals.length === 0) {
        throw new Error("No offer found");
      }

      const signalData = signals[0].signal_data as Record<string, unknown>;
      const offer = signalData.offer as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      await supabase.from("call_signals").insert({
        call_session_id: session.id,
        sender_id: currentUserId,
        signal_type: "answer",
        signal_data: JSON.parse(JSON.stringify({ answer: pc.localDescription?.toJSON() })),
      });

      // Update session status
      await supabase
        .from("call_sessions")
        .update({ status: "active", answered_at: new Date().toISOString() })
        .eq("id", session.id);

      // Mark call active and start timer
      activeSinceRef.current = Date.now();
      setCallStatus("active");
      startDurationTimer();
    } catch (error) {
      logger.error("❌ Error answering call:", error);
      throw error;
    }
  };

  const setupSignalingChannel = async () => {
    const currentSessionId = sessionIdRef.current;
    logger.log("📡 Setting up signaling channel for sessionId:", currentSessionId);

    const channel = supabase
      .channel(`call_signals_session_${currentSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `call_session_id=eq.${currentSessionId}`,
        },
        async (payload) => {
          const signal = payload.new;
          logger.log("📨 Received signal:", signal);
          // Subscription already filters to current call_session_id

          // Ignore own signals
          logger.log(
            "🔍 Checking sender - signal.sender_id:",
            signal.sender_id,
            "currentUserId:",
            currentUserId,
            "signal.signal_type:",
            signal.signal_type
          );
          if (signal.sender_id === currentUserId) {
            logger.log("⏭️ Ignoring own signal");
            return;
          }

          await processSignal(signal as CallSignal);
        }
      )
      .subscribe((status) => {
        logger.log("📡 Signaling channel status:", status);
      });

    signalChannelRef.current = channel;

    // Wait a moment for subscription to be fully established
    await new Promise((resolve) => setTimeout(resolve, 500));
    logger.log("✅ Signaling channel ready");

    // Backfill any signals that may have been missed before subscription
    try {
      const since = new Date(Date.now() - 60_000).toISOString(); // last 60s window
      const { data: missed, error: missedErr } = await supabase
        .from("call_signals")
        .select("*")
        .eq("call_session_id", currentSessionId)
        .neq("sender_id", currentUserId)
        .in("signal_type", ["answer", "ice-candidate"]) // avoid stale 'end' from backfill
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (missedErr) {
        logger.warn("⚠️ Could not backfill signals:", missedErr);
      } else if (missed && missed.length > 0) {
        logger.log(`📦 Backfilling ${missed.length} missed signals...`);
        for (const s of missed) {
          await processSignal(s as CallSignal);
        }
      } else {
        logger.log("📦 No missed signals to backfill");
      }
    } catch (e) {
      logger.warn("⚠️ Backfill error:", e);
    }
  };

  // Helper to process answer/ice/end consistently and safely
  const processSignal = async (signal: CallSignal) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      logger.log("⚠️ No peer connection available");
      return;
    }
    try {
      if (signal.signal_type === "answer") {
        logger.log("✅ Processing answer signal (processSignal)");
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data.answer));
        logger.log("✅ Remote description set, call should be active");
        activeSinceRef.current = Date.now();
        setCallStatus("active");
        stopOutgoingRingtone();
        startDurationTimer();
      } else if (signal.signal_type === "ice-candidate") {
        logger.log("🧊 Processing ICE candidate (processSignal)");
        await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
      } else if (signal.signal_type === "end") {
        // Guard early end within short window after activation to avoid race with backfill/late events
        const createdAt = new Date(signal.created_at).getTime();
        const activeSince = activeSinceRef.current;
        if (activeSince && createdAt - activeSince < 2000) {
          logger.log("⏭️ Ignoring early 'end' signal within activation grace window");
          return;
        }
        logger.log("🛑 Received end signal (processSignal)");
        endCall(false);
      }
    } catch (error) {
      logger.error("❌ Error handling signal in processSignal:", error);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && callType === "video") {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const stopOutgoingRingtone = () => {
    if (outgoingRingtoneRef.current) {
      outgoingRingtoneRef.current.pause();
      outgoingRingtoneRef.current.currentTime = 0;
    }
  };

  const startDurationTimer = () => {
    // Clear any existing timer to prevent double-counting
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const endCall = async (sendSignal: boolean = true) => {
    logger.log("🛑 Ending call...");

    setCallStatus("ended");
    stopOutgoingRingtone();

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Send end signal
    if (sendSignal && sessionId) {
      await supabase.from("call_signals").insert({
        call_session_id: sessionId,
        sender_id: currentUserId,
        signal_type: "end",
        signal_data: {},
      });

      // Update session
      await supabase
        .from("call_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    cleanup();

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const blockAndEnd = async () => {
    try {
      await blockUserApi(currentUserId, otherUserId);
      toast({
        title: "User blocked",
        description: "You won't receive further calls or messages from this user.",
      });
    } catch (e) {
      logger.error("Failed to block user during call:", e);
    } finally {
      await endCall(true);
    }
  };

  function cleanup() {
    // Stop local tracks
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    // Stop remote tracks and clear the stream
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;

    // Detach media from video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    // Close peer connection
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    // Unsubscribe from channel
    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    // Stop ringtone
    stopOutgoingRingtone();

    // Clear timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Reset session refs
    setSessionId(null);
    sessionIdRef.current = null;
    activeSinceRef.current = null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          endCall(true);
        }
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[600px] bg-[hsl(345,25%,20%)] text-white border-[hsl(345,70%,55%)]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(25,85%,70%)]">
            {callType === "video" ? "Video Call" : "Voice Call"} with {matchName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {callStatus === "connecting" && "Connecting..."}
            {callStatus === "ringing" && "Ringing..."}
            {callStatus === "active" && `Call duration ${formatDuration(callDuration)}`}
            {callStatus === "ended" && "Call ended"}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {callType === "video" ? (
            <div className="space-y-4">
              {/* Remote video */}
              <div className="relative aspect-video bg-gradient-to-br from-muted to-muted rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover bg-primary"
                />
                {(callStatus === "ringing" || callStatus === "ended") && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/80">
                    {matchImage ? (
                      <img
                        src={matchImage}
                        alt={matchName}
                        className="w-32 h-32 rounded-full object-cover border-4 border-[hsl(345,70%,55%)]"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(345,70%,55%)] to-[hsl(25,85%,70%)] flex items-center justify-center">
                        <span className="text-5xl">{matchName[0]}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Local video (PIP) */}
              {!isVideoOff && (
                <div className="absolute top-4 right-4 w-32 h-24 bg-gradient-to-br from-muted to-muted rounded-lg overflow-hidden border-2 border-[hsl(25,85%,70%)] shadow-xl z-10">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Voice call UI */
            <div className="flex flex-col items-center justify-center py-12">
              {matchImage ? (
                <img
                  src={matchImage}
                  alt={matchName}
                  className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-[hsl(345,70%,55%)]"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(345,70%,55%)] to-[hsl(25,85%,70%)] flex items-center justify-center mb-4">
                  <span className="text-5xl">{matchName[0]}</span>
                </div>
              )}
              <h3 className="text-2xl font-bold text-[hsl(25,85%,70%)]">{matchName}</h3>

              {/* Hidden audio element for voice calls */}
              <audio
                ref={remoteVideoRef}
                autoPlay
                playsInline
                controls={false}
                className="hidden absolute"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              size="icon"
              className="rounded-full h-14 w-14 bg-red-700 hover:bg-red-800"
              onClick={blockAndEnd}
              title="Block user and end call"
            >
              <Ban className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              className={`rounded-full h-14 w-14 ${
                isMuted
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[hsl(345,25%,30%)] hover:bg-[hsl(345,25%,35%)]"
              }`}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            {callType === "video" && (
              <Button
                size="icon"
                className={`rounded-full h-14 w-14 ${
                  isVideoOff
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[hsl(345,25%,30%)] hover:bg-[hsl(345,25%,35%)]"
                }`}
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            )}

            <Button
              size="icon"
              className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700"
              onClick={() => endCall(true)}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
