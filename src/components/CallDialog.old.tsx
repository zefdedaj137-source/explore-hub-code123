import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff as VideoOffIcon, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CallDialogProps {
  matchId: string;
  currentUserId: string;
  matchName: string;
  matchProfileImage: string | null;
  isOpen: boolean;
  onClose: () => void;
  callType: "voice" | "video";
  isAnswering?: boolean; // Whether we're answering an incoming call
}

export const CallDialog = ({
  matchId,
  currentUserId,
  matchName,
  matchProfileImage,
  isOpen,
  onClose,
  callType,
  isAnswering = false, // Default to false (initiating new call)
}: CallDialogProps) => {
  const [callStatus, setCallStatus] = useState<"calling" | "ringing" | "connecting" | "connected" | "ended">("calling");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const outgoingRingtoneRef = useRef<HTMLAudioElement | null>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Initialize call - only runs once when component mounts
  useEffect(() => {
    console.log('📞 CallDialog mounted');
    
    return () => {
      console.log('� CallDialog unmounting, cleaning up');
      endCall(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only mount/unmount

  // Initialize call when dialog opens
  useEffect(() => {
    console.log('� isOpen changed:', isOpen);
    if (isOpen && !peerConnectionRef.current) {
      console.log('🚀 Initializing call...');
      initializeCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Call timer
  useEffect(() => {
    if (callStatus === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callStatus]);

  // Outgoing call ringtone
  useEffect(() => {
    // Only play ringtone if dialog is actually open AND we're initiating the call (not answering)
    if (!isOpen || isAnswering) return;
    
    // Play outgoing ringtone when calling or ringing
    if (callStatus === "calling" || callStatus === "ringing") {
      console.log('🎵 Playing outgoing call ringtone...');
      try {
        const audioFile = callType === 'video' ? '/outgoing-video-call.mp3' : '/outgoing-voice-call.mp3';
        outgoingRingtoneRef.current = new Audio(audioFile);
        outgoingRingtoneRef.current.loop = true;
        outgoingRingtoneRef.current.volume = 0.6;
        outgoingRingtoneRef.current.play().catch((err) => {
          console.error('❌ Failed to play outgoing ringtone:', err);
        });
      } catch (error) {
        console.error('❌ Error creating outgoing ringtone:', error);
      }
    } else {
      // Stop ringtone when connected or ended
      if (outgoingRingtoneRef.current) {
        console.log('🔇 Stopping outgoing call ringtone');
        outgoingRingtoneRef.current.pause();
        outgoingRingtoneRef.current.currentTime = 0;
        outgoingRingtoneRef.current = null;
      }
    }

    return () => {
      if (outgoingRingtoneRef.current) {
        outgoingRingtoneRef.current.pause();
        outgoingRingtoneRef.current = null;
      }
    };
  }, [isOpen, callStatus, callType, isAnswering]);

  const initializeCall = async () => {
    try {
      console.log('🎬 initializeCall started');
      console.log('📊 Call params:', { matchId, currentUserId, callType, matchName, isAnswering });
      setCallStatus("connecting");
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ MediaDevices not supported');
        throw new Error("Your browser doesn't support camera/microphone access. Please use Chrome, Safari, or Firefox.");
      }

      console.log('✅ MediaDevices supported');
      console.log('🎥 Requesting media access...');

      // Use the isAnswering prop passed from parent
      console.log(isAnswering ? '📞 Answering incoming call' : '📱 Initiating new call');
      
      // Always clean up old signals to prevent confusion
      console.log('🧹 Cleaning up old call signals...');
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      await supabase
        .from("call_signals")
        .delete()
        .eq('match_id', matchId)
        .lt('created_at', oneMinuteAgo);
      
      if (!isAnswering) {
        // Clean up ONLY our OLD call notifications (don't delete active incoming calls!)
        await supabase
          .from("call_notifications")
          .delete()
          .eq('match_id', matchId)
          .eq('caller_id', currentUserId)
          .lt('created_at', oneMinuteAgo);
        
        console.log('✅ Old signals cleaned');
      } else {
        console.log('✅ Old signals cleaned (keeping active notifications)');
      }

      // Get user media with Safari-compatible constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === "video" ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false,
      };

      console.log('Requesting media access with constraints:', constraints);
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: unknown) {
        console.error('getUserMedia error:', error);
        const err = error as { name?: string; message?: string };
        
        // Check if accessing via HTTP (not HTTPS) from non-localhost
        const isInsecureContext = window.location.protocol === 'http:' && 
                                   !window.location.hostname.includes('localhost') && 
                                   !window.location.hostname.includes('127.0.0.1');
        
        // Provide specific error messages
        if (isInsecureContext) {
          throw new Error('🔒 Camera/microphone requires HTTPS connection.\n\n' +
                         'For testing on your network:\n' +
                         '1. Use localhost instead of IP address, OR\n' +
                         '2. Set up HTTPS with a self-signed certificate, OR\n' +
                         '3. Use a service like ngrok for HTTPS tunneling\n\n' +
                         'Current URL: ' + window.location.href);
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Camera/microphone permission denied. Please allow access in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('No camera/microphone found. Please connect a device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          throw new Error('Camera/microphone is already in use by another application.');
        } else {
          throw new Error(`Could not access camera/microphone: ${err.message || 'Unknown error'}`);
        }
      }

      localStreamRef.current = stream;

      if (localVideoRef.current && callType === "video") {
        console.log('📹 Setting local video srcObject, tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
        localVideoRef.current.srcObject = stream;
        // Auto-play video on mobile Safari
        localVideoRef.current.play()
          .then(() => console.log('✅ Local video playing'))
          .catch(e => console.error('❌ Error playing local video:', e));
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      stream.getTracks().forEach((track) => {
        console.log('➕ Adding track to peer connection:', track.kind, track.label, 'enabled:', track.enabled);
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        console.log('🎥 Received remote track:', event.track.kind, 'enabled:', event.track.enabled, 'readyState:', event.track.readyState);
        console.log('📺 Remote streams:', event.streams.length, 'tracks:', event.streams[0]?.getTracks().map(t => `${t.kind}:${t.enabled}`));
        
        if (remoteVideoRef.current && event.streams[0]) {
          console.log('✅ Setting remote video srcObject');
          remoteVideoRef.current.srcObject = event.streams[0];
          
          // Ensure video element is visible and playing
          remoteVideoRef.current.style.display = 'block';
          
          // Auto-play remote video with better error handling
          setTimeout(() => {
            if (remoteVideoRef.current) {
              console.log('▶️ Attempting to play remote video...');
              remoteVideoRef.current.play()
                .then(() => console.log('✅ Remote video playing successfully'))
                .catch(e => {
                  console.log('⚠️ Auto-play blocked:', e.message);
                  // Try clicking on video element to start playback
                  remoteVideoRef.current?.addEventListener('click', () => {
                    remoteVideoRef.current?.play();
                  }, { once: true });
                });
            }
          }, 100);
        }
        setCallStatus("connected");
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          // Send ICE candidate via Supabase
          await supabase.from("call_signals").insert({
            match_id: matchId,
            sender_id: currentUserId,
            signal_type: "ice-candidate",
            signal_data: JSON.stringify(event.candidate),
          });
        } else {
          console.log('✅ ICE gathering complete');
        }
      };

      // Monitor ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('🔗 ICE connection state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established');
        } else if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'disconnected') {
          console.error('❌ ICE connection failed or disconnected');
          toast.error('Connection lost. Please try again.');
          endCall(true);
        }
      };

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
          console.error('❌ Peer connection failed');
          toast.error('Connection failed. Please try again.');
          endCall(true);
        } else if (peerConnection.connectionState === 'disconnected') {
          console.log('⚠️ Peer connection disconnected');
        }
      };

      // Set up signal listener FIRST before sending any signals
      // This ensures we don't miss any ICE candidates or answers
      listenForSignals();
      console.log('🎧 Signal listener ready');

      // Different flow for answering vs initiating
      if (isAnswering) {
        console.log('📞 Setting up to answer call...');
        // We're answering - get the most recent offer from the other user (within last 30 seconds)
        const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
        const { data: existingOffers } = await supabase
          .from("call_signals")
          .select("*")
          .eq('match_id', matchId)
          .eq('signal_type', 'offer')
          .neq('sender_id', currentUserId)
          .gt('created_at', thirtySecondsAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingOffers && existingOffers.length > 0) {
          const offerSignal = existingOffers[0] as Record<string, unknown>;
          const offerData = JSON.parse(String(offerSignal.signal_data));
          
          console.log('📥 Received offer, creating answer...');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData));
          
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          // Send answer
          console.log('📤 Sending answer...');
          await supabase.from("call_signals").insert({
            match_id: matchId,
            sender_id: currentUserId,
            signal_type: "answer",
            signal_data: JSON.stringify(answer),
          });
          
          setCallStatus("connecting"); // Stay in connecting until ontrack fires
          console.log('✅ Answer sent, waiting for connection...');
        } else {
          throw new Error('No recent offer found to answer. The call may have expired.');
        }
      } else {
        console.log('📱 Initiating new call...');
        // We're initiating - create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send offer via Supabase
        await supabase.from("call_signals").insert({
          match_id: matchId,
          sender_id: currentUserId,
          signal_type: "offer",
          signal_data: JSON.stringify(offer),
          call_type: callType,
        });

        // Send call notification
        console.log('📲 Sending call notification:', {
          match_id: matchId,
          caller_id: currentUserId,
          call_type: callType,
          status: "calling",
        });
        
        const { data: notificationData, error: notificationError } = await supabase
          .from("call_notifications")
          .insert({
            match_id: matchId,
            caller_id: currentUserId,
            call_type: callType,
            status: "calling",
          })
          .select();

        if (notificationError) {
          console.error('❌ Error inserting call notification:', notificationError);
        } else {
          console.log('✅ Call notification sent successfully:', notificationData);
        }

        setCallStatus("ringing");
      }

      // Signal listener was already set up earlier
    } catch (error) {
      console.error("Error initializing call:", error);
      toast.error("Could not access camera/microphone");
      onClose();
    }
  };

  const listenForSignals = () => {
    const channel = supabase
      .channel(`call-${matchId}-${Date.now()}`) // Unique channel to avoid conflicts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload: { new: { sender_id: string; signal_type: string; signal_data: string | Record<string, unknown> } }) => {
          const signal = payload.new;
          
          if (signal.sender_id === currentUserId) return;

          // Parse signal_data if it's a string, otherwise use as-is
          let signalData;
          try {
            signalData = typeof signal.signal_data === 'string' 
              ? JSON.parse(signal.signal_data) 
              : signal.signal_data;
          } catch (error) {
            console.error('❌ Error parsing signal data:', error);
            return;
          }

          console.log('📡 Received signal:', signal.signal_type);

          if (signal.signal_type === "answer" && peerConnectionRef.current) {
            console.log('📥 Processing answer...');
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(signalData)
            );
            console.log('✅ Answer processed, waiting for media connection...');
            // Don't set "connected" here - let ontrack event handle it
          } else if (signal.signal_type === "ice-candidate" && peerConnectionRef.current) {
            console.log('🧊 Adding ICE candidate...');
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(signalData)
              );
              console.log('✅ ICE candidate added successfully');
            } catch (error) {
              console.error('❌ Error adding ICE candidate:', error);
            }
          } else if (signal.signal_type === "end-call") {
            console.log('🔚 Received end-call signal');
            endCall(false); // Don't send another end-call signal
          } else {
            console.log('⚠️ Ignoring unknown signal type:', signal.signal_type);
          }
        }
      )
      .subscribe();
    
    // Store channel reference for cleanup
    signalChannelRef.current = channel;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsSpeakerOff(remoteVideoRef.current.muted);
    }
  };

  const endCall = async (sendSignal: boolean = true) => {
    console.log('🛑 endCall called, sendSignal:', sendSignal);
    
    // Unsubscribe from signals FIRST to prevent infinite loop
    if (signalChannelRef.current) {
      console.log('📡 Unsubscribing from signal channel...');
      await supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    // Send end call signal only if requested (not when receiving end-call)
    if (sendSignal) {
      console.log('📤 Sending end-call signal...');
      await supabase.from("call_signals").insert({
        match_id: matchId,
        sender_id: currentUserId,
        signal_type: "end-call",
        signal_data: "{}",
      });
    }

    // Stop all tracks
    if (localStreamRef.current) {
      console.log('🛑 Stopping local tracks...');
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      console.log('🔌 Closing peer connection...');
      peerConnectionRef.current.close();
    }

    setCallStatus("ended");
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>
            {callType === "video" ? "Video Call" : "Voice Call"} with {matchName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {callStatus === "calling" && "Calling..."}
            {callStatus === "ringing" && "Ringing..."}
            {callStatus === "connected" && formatDuration(callDuration)}
            {callStatus === "ended" && "Call ended"}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {callType === "video" ? (
            <div className="space-y-4">
              {/* Remote video (large) */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: 'block', backgroundColor: '#000' }}
                />
                {callStatus !== "connected" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    {matchProfileImage ? (
                      <img
                        src={matchProfileImage}
                        alt={matchName}
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                        <span className="text-5xl font-serif">{matchName[0]}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Local video (small, picture-in-picture) */}
              {!isVideoOff && (
                <div className="absolute top-4 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-white shadow-xl z-10">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                    style={{ display: 'block', transform: 'scaleX(-1)' }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Voice call UI */
            <div className="flex flex-col items-center justify-center py-12">
              {matchProfileImage ? (
                <img
                  src={matchProfileImage}
                  alt={matchName}
                  className="w-32 h-32 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-4">
                  <span className="text-5xl font-serif">{matchName[0]}</span>
                </div>
              )}
              <h3 className="text-2xl font-bold">{matchName}</h3>
            </div>
          )}

          {/* Call controls */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full h-14 w-14 ${
                isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            {callType === "video" && (
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full h-14 w-14 ${
                  isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOffIcon className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              className={`rounded-full h-14 w-14 ${
                isSpeakerOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={toggleSpeaker}
            >
              {isSpeakerOff ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </Button>

            <Button
              variant="destructive"
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

// CSS for mirror effect on local video
const style = document.createElement('style');
style.textContent = `
  .mirror {
    transform: scaleX(-1);
  }
`;
document.head.appendChild(style);
