import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Video, Heart, X, Music, Sparkles, Trophy, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

interface OpponentProfile {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  city?: string;
}

// Albanian Valle songs with audio URLs
const VALLE_SONGS = [
  { name: "Valle Laborë (Lab polyphonic)", emoji: "🎭", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "Valle Pogradecit", emoji: "🏔️", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { name: "Valle Malësorëve të Shkodrës", emoji: "⛰️", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { name: "Shota e Korçës", emoji: "🎵", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { name: "Valle Dibrane", emoji: "🪕", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { name: "Kënga e Valles Arbereshe", emoji: "🇮🇹", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
];

const GameSessionDance = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [opponent, setOpponent] = useState<OpponentProfile | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentDancerId, setCurrentDancerId] = useState<string | null>(null);
  const [iLikedThem, setILikedThem] = useState(false);
  const [theyLikedMe, setTheyLikedMe] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [opponentVideoUrl, setOpponentVideoUrl] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'myTurn' | 'theirTurn' | 'reviewing' | 'finished'>('waiting');
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(10);
  const [actionTaken, setActionTaken] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (user && sessionId) {
      initializeGame();
      subscribeToGameUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  useEffect(() => {
    if (isRecording && recordingTime > 0) {
      const timer = setTimeout(() => setRecordingTime(recordingTime - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isRecording && recordingTime === 0) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, recordingTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopMusic();
    };
  }, []);

  const initializeGame = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invite, error } = await (supabase as any)
        .from('game_invites')
        .select(`
          from_user_id,
          to_user_id,
          from_user:profiles!game_invites_from_user_id_fkey(id, full_name, age, profile_image_url, city),
          to_user:profiles!game_invites_to_user_id_fkey(id, full_name, age, profile_image_url, city)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      const opponentData = invite.from_user_id === user?.id 
        ? invite.to_user 
        : invite.from_user;
      
      setOpponent(opponentData);
      setCurrentDancerId(invite.from_user_id);
      
      if (invite.from_user_id === user?.id) {
        setGamePhase('myTurn');
      } else {
        setGamePhase('theirTurn');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing game:', error);
      toast.error("Failed to load dance challenge");
      navigate('/game-lobby');
    }
  };

  const subscribeToGameUpdates = () => {
    if (!sessionId) return;

    console.log('🎮 Subscribing to game updates for session:', sessionId);
    const channelName = `dance-challenge-${sessionId}`;
    console.log('🎮 Channel name:', channelName);

    // Unsubscribe from previous channel if exists
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'broadcast',
        { event: 'video_sent' },
        async (payload) => {
          console.log('📹 Received video_sent broadcast:', payload);
          const videoUrl = payload.payload.videoUrl;
          const senderId = payload.payload.senderId;
          console.log('📹 Video URL:', videoUrl);
          console.log('📹 Sender ID:', senderId, 'My ID:', user?.id);
          
          // Don't show own video
          if (senderId !== user?.id) {
            console.log('📹 Setting opponent video and showing review');
            setOpponentVideoUrl(videoUrl);
            setGamePhase('reviewing');
            setShowReview(true);
          } else {
            console.log('📹 Ignoring own video');
          }
        }
      )
      .on(
        'broadcast',
        { event: 'review_complete' },
        async (payload) => {
          console.log('✅ Review complete:', payload);
          const { liked, reviewerId } = payload.payload;
          
          // Track who liked whom
          if (reviewerId !== user?.id) {
            // They reviewed me
            setTheyLikedMe(liked);
            
            // Check if we both liked - create match automatically
            if (liked && iLikedThem && user && opponent) {
              // Create the like in database
              try {
                await supabase.from("likes").insert({
                  liker_id: user.id,
                  liked_id: opponent.id,
                });
                toast.success("It's a Match! 🎉", {
                  description: "Check your matches to start chatting!"
                });
              } catch (error) {
                console.error("Error creating match:", error);
              }
            }
            
            setGamePhase('finished');
          } else {
            // I reviewed them, wait for their review
            setShowReview(false);
            toast.info("Waiting for their review...");
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to channel');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Unsubscribing from channel:', channelName);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCountdown(3);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error("Failed to access camera");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedVideo(blob);
      stopCamera();
      stopMusic();
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(10);
    setCountdown(null);
    playMusic();
  };

  const playMusic = () => {
    const currentSong = VALLE_SONGS[(currentRound - 1) % VALLE_SONGS.length];
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(currentSong.audioUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(err => {
      console.error('Error playing music:', err);
    });
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const sendVideo = async () => {
    if (!recordedVideo || !user || !sessionId) return;

    // Upload video to Supabase Storage
    const filePath = `dance-challenges/${sessionId}/round${currentRound}-${user.id}.webm`;
    const { error: uploadError } = await supabase.storage
      .from('dance-videos')
      .upload(filePath, recordedVideo, { upsert: true, contentType: 'video/webm' });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload video');
      return;
    }
    
    // Get signed URL for private bucket (valid for 1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('dance-videos')
      .createSignedUrl(filePath, 3600);
    
    if (signedError || !signedData) {
      console.error('Signed URL error:', signedError);
      toast.error('Failed to generate video URL');
      return;
    }
    
    const videoUrl = signedData.signedUrl;

    console.log('🎥 Sending video via broadcast:', { videoUrl, sessionId, senderId: user.id });
    
    if (!channelRef.current) {
      console.error('❌ Channel not initialized!');
      toast.error('Connection error. Please refresh and try again.');
      return;
    }
    
    const result = await channelRef.current.send({
      type: 'broadcast',
      event: 'video_sent',
      payload: { 
        videoUrl,
        senderId: user.id,
        round: currentRound
      }
    });
    
    console.log('📡 Broadcast result:', result);

    setGamePhase('theirTurn');
    toast.success("Video sent! 🎥");
  };

  const reviewVideo = async (liked: boolean) => {
    if (!channelRef.current) {
      console.error('❌ Channel not initialized!');
      toast.error('Connection error. Please refresh and try again.');
      return;
    }
    
    setILikedThem(liked);
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'review_complete',
      payload: { 
        liked,
        reviewerId: user?.id,
        round: currentRound
      }
    });

    setShowReview(false);
    
    if (liked) {
      toast.success("You liked their dance! 💃");
    } else {
      toast.info("Waiting for final results...");
    }
  };

  const handleLike = async () => {
    if (!opponent || !user || actionTaken) return;
    
    setActionTaken(true);
    
    // Check if it's a match (both liked each other)
    if (!iLikedThem || !theyLikedMe) {
      toast.info("No match this time!");
      navigate('/game-lobby');
      return;
    }
    
    try {
      const { data: existingLike } = await supabase
        .from("likes")
        .select("*")
        .eq("liker_id", user.id)
        .eq("liked_id", opponent.id)
        .maybeSingle();

      if (existingLike) {
        toast.info(`You already liked ${opponent.full_name}!`);
        navigate('/game-lobby');
        return;
      }

      const { error } = await supabase
        .from("likes")
        .insert({
          liker_id: user.id,
          liked_id: opponent.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info(`You already liked ${opponent.full_name}!`);
          navigate('/game-lobby');
          return;
        }
        throw error;
      }

      toast.success(`You liked ${opponent.full_name}! 💕`);
      
      const { data: matchData } = await supabase
        .from("likes")
        .select("*")
        .eq("liker_id", opponent.id)
        .eq("liked_id", user.id)
        .maybeSingle();

      if (matchData) {
        toast.success("It's a Match! 🎉", {
          description: "You can now chat with each other"
        });
      }
      
      navigate('/game-lobby');
    } catch (error) {
      console.error("Error liking profile:", error);
      toast.error("Failed to like profile");
      setActionTaken(false);
    }
  };

  const handlePass = () => {
    if (actionTaken) return;
    setActionTaken(true);
    stopCamera();
    toast("Returning to lobby...");
    navigate('/game-lobby');
  };

  if (loading || !opponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Music className="h-16 w-16 text-orange-500 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading dance challenge...</p>
        </div>
      </div>
    );
  }

  const currentSong = VALLE_SONGS[(currentRound - 1) % VALLE_SONGS.length];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-4">
            <Music className="h-10 w-10 text-orange-500 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-orange-600">Dance Challenge 💃</h2>
            <p className="text-sm text-gray-600">Dance to Albanian Valle!</p>
            <Badge variant="outline" className="mt-2">
              {currentSong.emoji} {currentSong.name} - Round {currentRound}/2
            </Badge>
          </div>

          {/* Current Round Info */}
          <div className="text-center mb-6">
            <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500">
              Dance Challenge
            </Badge>
          </div>

          {/* Game Phase */}
          {gamePhase === 'myTurn' && !recordedVideo && (
            <div className="text-center space-y-4">
              {countdown !== null ? (
                <div className="py-12">
                  <p className="text-6xl font-bold text-orange-500 animate-pulse">{countdown}</p>
                  <p className="text-lg text-gray-600 mt-4">Get ready to dance!</p>
                </div>
              ) : !isRecording ? (
                <div className="space-y-4">
                  <p className="text-lg font-semibold">Your Turn! 🎵</p>
                  <p className="text-gray-600">Dance to {currentSong.name} for 10 seconds</p>
                  <Button
                    onClick={requestCamera}
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                  >
                    <Video className="mr-2" /> Start Dancing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                  />
                  <div className="text-center">
                    <p className="text-4xl font-bold text-orange-500">{recordingTime}s</p>
                    <p className="text-sm text-gray-600">Recording...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {gamePhase === 'myTurn' && recordedVideo && (
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold">Preview Your Dance 💃</p>
              <video
                src={URL.createObjectURL(recordedVideo)}
                controls
                className="w-full max-w-md mx-auto rounded-lg shadow-lg"
              />
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setRecordedVideo(null);
                    setGamePhase('myTurn');
                  }}
                  variant="outline"
                >
                  Record Again
                </Button>
                <Button
                  onClick={sendVideo}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                >
                  Send Video 🚀
                </Button>
              </div>
            </div>
          )}

          {gamePhase === 'theirTurn' && (
            <div className="text-center py-12">
              <Music className="h-16 w-16 text-orange-500 animate-pulse mx-auto mb-4" />
              <p className="text-lg font-semibold">{opponent.full_name} is dancing...</p>
              <p className="text-sm text-gray-600 mt-2">Get ready to review!</p>
            </div>
          )}

          {showReview && opponentVideoUrl && (
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold">Rate {opponent.full_name}'s Dance! 🎵</p>
              <video
                src={opponentVideoUrl}
                controls
                autoPlay
                className="w-full max-w-md mx-auto rounded-lg shadow-lg"
              />
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => reviewVideo(false)}
                  variant="outline"
                  className="w-24 h-24 rounded-full border-4 border-gray-300 hover:border-red-400 hover:bg-red-50"
                >
                  <div className="flex flex-col items-center">
                    <X className="h-8 w-8 text-gray-600" />
                    <span className="text-xs mt-1">Pass</span>
                  </div>
                </Button>
                <Button
                  onClick={() => reviewVideo(true)}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700"
                >
                  <div className="flex flex-col items-center">
                    <Heart className="h-8 w-8 text-white fill-white" />
                    <span className="text-xs mt-1 text-white">Like</span>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {gamePhase === 'finished' && (
            <div className="text-center space-y-6">
              {iLikedThem && theyLikedMe ? (
                <>
                  <Trophy className="h-20 w-20 text-yellow-500 mx-auto animate-bounce" />
                  <h2 className="text-3xl font-bold text-yellow-500">It's a Match! 🎉</h2>
                  <p className="text-xl text-gray-700">
                    You both liked each other's dance moves!
                  </p>
                  <p className="text-gray-600">
                    A like has been automatically created. Check your matches to start chatting!
                  </p>
                </>
              ) : (
                <>
                  <Music className="h-20 w-20 text-gray-400 mx-auto" />
                  <h2 className="text-3xl font-bold text-gray-700">No Match</h2>
                  <p className="text-xl text-gray-600">
                    {!iLikedThem && !theyLikedMe && "Neither of you liked each other's dance"}
                    {iLikedThem && !theyLikedMe && "You liked them, but they passed"}
                    {!iLikedThem && theyLikedMe && "They liked you, but you passed"}
                  </p>
                  <p className="text-gray-500">Better luck next time!</p>
                </>
              )}

              <div className="flex gap-4 justify-center pt-6">
                <Button
                  onClick={() => navigate('/game-lobby')}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                >
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  Back to Lobby
                </Button>
                <Button
                  onClick={() => navigate('/discover')}
                  variant="outline"
                >
                  Find More Matches
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GameSessionDance;
