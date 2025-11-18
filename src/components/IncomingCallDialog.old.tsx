import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Video, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IncomingCall {
  id: string;
  match_id: string;
  caller_id: string;
  call_type: "voice" | "video";
  caller_name: string;
  caller_image: string | null;
}

interface IncomingCallDialogProps {
  onAccept: (matchId: string, callType: "voice" | "video") => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const IncomingCallDialog = ({ onAccept }: IncomingCallDialogProps) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);

  console.log('🔄 IncomingCallDialog rendered, user:', user?.id, 'incomingCall:', incomingCall?.id);

  const handleReject = useCallback(async () => {
    if (!incomingCall) return;

    // Stop ringtone
    if ((window as any)._ringtoneCleanup) {
      (window as any)._ringtoneCleanup();
    }

    // Update call status
    await supabase
      .from('call_notifications' as any)
      .update({ 
        status: 'rejected',
        ended_at: new Date().toISOString()
      } as any)
      .eq('id', incomingCall.id);

    // Send rejection signal
    await supabase.from('call_signals' as any).insert({
      match_id: incomingCall.match_id,
      sender_id: user?.id,
      signal_type: 'call-rejected',
      signal_data: '{}',
    } as any);

    setIsRinging(false);
    setIncomingCall(null);
    toast.info('Call declined');
  }, [incomingCall, user]);

  useEffect(() => {
    if (!user || !incomingCall) return;

    console.log('🎵 Ringtone useEffect triggered, call_type:', incomingCall.call_type);

    // Create ringtone using audio file
    const createRingtone = (callType: "voice" | "video") => {
      console.log(`🎵 Creating ${callType} call ringtone`);
      let ringtoneAudio: HTMLAudioElement | null = null;
      let stopRequested = false;

      const playRingtone = () => {
        if (stopRequested) return;

        try {
          // Use different ringtones for voice vs video calls
          const audioFile = callType === 'video' ? '/video-call-ringtone.mp3' : '/voice-call-ringtone.mp3';
          console.log(`🎵 Selected audio file: ${audioFile}`);
          ringtoneAudio = new Audio(audioFile);
          ringtoneAudio.loop = true; // Loop the ringtone
          ringtoneAudio.volume = 0.7;
          
          // Try to play audio
          const playPromise = ringtoneAudio.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`🎵 ${callType} call ringtone playing`);
              })
              .catch((err) => {
                console.error('❌ Failed to play ringtone (autoplay blocked):', err);
                
                // Show visual notification since audio is blocked
                if (typeof document !== 'undefined' && document.title) {
                  // Flash the page title as notification
                  const originalTitle = document.title;
                  let flashCount = 0;
                  const titleFlash = setInterval(() => {
                    if (stopRequested || flashCount >= 20) {
                      clearInterval(titleFlash);
                      document.title = originalTitle;
                    } else {
                      document.title = flashCount % 2 === 0 ? '🔔 INCOMING CALL!' : originalTitle;
                      flashCount++;
                    }
                  }, 500);
                  // Store interval for cleanup
                  (ringtoneAudio as any)._titleFlash = titleFlash;
                }
                
                // Vibrate as fallback on mobile
                if ('vibrate' in navigator) {
                  console.log('📳 Using vibration fallback');
                  // Vibrate pattern: vibrate for 500ms, pause 500ms, repeat
                  const vibratePattern = [500, 500];
                  const vibrateInterval = setInterval(() => {
                    if (stopRequested) {
                      clearInterval(vibrateInterval);
                    } else {
                      navigator.vibrate(vibratePattern);
                    }
                  }, 1000);
                  // Store interval for cleanup
                  (ringtoneAudio as any)._vibrateInterval = vibrateInterval;
                }
              });
          }
        } catch (error) {
          console.error('❌ Error creating ringtone:', error);
        }
      };

      const stop = () => {
        console.log('🔇 Stopping ringtone');
        stopRequested = true;
        if (ringtoneAudio) {
          ringtoneAudio.pause();
          ringtoneAudio.currentTime = 0;
          
          // Stop title flashing if active
          if ((ringtoneAudio as any)._titleFlash) {
            clearInterval((ringtoneAudio as any)._titleFlash);
            if (typeof document !== 'undefined' && document.title.includes('INCOMING CALL')) {
              document.title = 'GH Explore Hub';
            }
          }
          
          // Stop vibration if active
          if ((ringtoneAudio as any)._vibrateInterval) {
            clearInterval((ringtoneAudio as any)._vibrateInterval);
          }
          if ('vibrate' in navigator) {
            navigator.vibrate(0); // Stop vibration
          }
          ringtoneAudio = null;
        }
      };

      // Start playing
      playRingtone();

      return stop;
    };

    // Create and start the ringtone with the call type
    console.log('🎵 Starting ringtone...');
    const stopRingtone = createRingtone(incomingCall.call_type);
    
    // Store cleanup function globally
    window._ringtoneCleanup = stopRingtone;
    
    // Auto-reject after 30 seconds
    const timeout = setTimeout(() => {
      handleReject();
    }, 30000);
    
    return () => {
      console.log('🧹 Cleanup: Stopping ringtone on unmount');
      stopRingtone();
      clearTimeout(timeout);
      window._ringtoneCleanup = undefined;
    };
  }, [user, incomingCall, handleReject]);

  // Separate useEffect for realtime listener
  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls
    console.log('🎧 Setting up incoming call listener for user:', user.id);
    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_notifications',
          filter: `status=eq.calling`,
        },
        async (payload: any) => {
          console.log('📞 Received call notification:', payload);
          const notification = payload.new;
          
          // Check if this call is for current user
          const { data: matchData } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .eq('id', notification.match_id)
            .single();

          console.log('🔍 Match data:', matchData);
          console.log('🔍 Current user:', user.id);
          console.log('🔍 Caller:', notification.caller_id);

          if (!matchData) return;

          const isRecipient = 
            (matchData.user1_id === user.id && notification.caller_id === matchData.user2_id) ||
            (matchData.user2_id === user.id && notification.caller_id === matchData.user1_id);

          console.log('🔍 Is recipient?', isRecipient);
          
          if (!isRecipient) return;

          // Get caller profile
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('full_name, profile_image_url')
            .eq('id', notification.caller_id)
            .single();

          if (callerProfile) {
            console.log('✅ Setting incoming call state');
            console.log('📞 Call Type:', notification.call_type);
            console.log('📞 Full notification:', notification);
            
            setIncomingCall({
              id: notification.id,
              match_id: notification.match_id,
              caller_id: notification.caller_id,
              call_type: notification.call_type,
              caller_name: callerProfile.full_name,
              caller_image: callerProfile.profile_image_url,
            });
            setIsRinging(true);

            toast.info(`Incoming ${notification.call_type} call from ${callerProfile.full_name}`, {
              duration: 30000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to incoming calls');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to incoming calls');
        }
      });

    return () => {
      console.log('🔌 Cleaning up incoming call listener');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAccept = async () => {
    if (!incomingCall) return;

    console.log('✅ Accepting call, closing notification dialog');

    // Stop ringtone immediately
    if ((window as any)._ringtoneCleanup) {
      (window as any)._ringtoneCleanup();
    }

    // Close the dialog immediately
    setIsRinging(false);
    const callInfo = { ...incomingCall };
    setIncomingCall(null);

    // Update call status
    await supabase
      .from('call_notifications' as any)
      .update({ 
        status: 'answered',
        answered_at: new Date().toISOString()
      } as any)
      .eq('id', callInfo.id);

    // No need to send call-accepted signal - the WebRTC answer signal serves this purpose
    // Trigger call dialog (navigates to chat page with autoAnswer param)
    onAccept(callInfo.match_id, callInfo.call_type);
  };

  if (!incomingCall || !isRinging) return null;

  return (
    <Dialog open={isRinging} onOpenChange={() => handleReject()}>
      <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-pink-500 to-purple-600 text-white border-none">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {incomingCall.call_type === "video" ? "📹 Incoming Video Call" : "📞 Incoming Voice Call"}
          </DialogTitle>
          <DialogDescription className="text-white/90 text-center">
            {incomingCall.caller_name} is calling...
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-8 space-y-6">
          {/* Caller Profile Picture */}
          <div className="relative">
            {incomingCall.caller_image ? (
              <img
                src={incomingCall.caller_image}
                alt={incomingCall.caller_name}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl animate-pulse"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center border-4 border-white shadow-2xl animate-pulse">
                <span className="text-6xl font-serif">{incomingCall.caller_name[0]}</span>
              </div>
            )}
            
            {/* Ringing animation */}
            <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-ping" />
          </div>

          {/* Caller Name */}
          <div className="text-center">
            <h3 className="text-3xl font-bold">{incomingCall.caller_name}</h3>
            <p className="text-white/80 mt-2 animate-pulse">Ringing...</p>
          </div>

          {/* Call Action Buttons */}
          <div className="flex gap-6 mt-8">
            {/* Reject Button */}
            <Button
              onClick={handleReject}
              size="lg"
              className="rounded-full h-20 w-20 bg-red-600 hover:bg-red-700 shadow-2xl transition-transform hover:scale-110"
            >
              <PhoneOff className="h-8 w-8" />
            </Button>

            {/* Accept Button */}
            <Button
              onClick={handleAccept}
              size="lg"
              className="rounded-full h-20 w-20 bg-green-600 hover:bg-green-700 shadow-2xl transition-transform hover:scale-110 animate-bounce"
            >
              {incomingCall.call_type === "video" ? (
                <Video className="h-8 w-8" />
              ) : (
                <Phone className="h-8 w-8" />
              )}
            </Button>
          </div>

          {/* Action Labels */}
          <div className="flex gap-16 text-sm">
            <span className="text-white/80">Decline</span>
            <span className="text-white/80">Accept</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
