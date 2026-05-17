import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
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

const VALLE_SONGS: { name: string; emoji: string; audioUrl: string | null }[] = [
  { name: "Valle Laborë (Lab polyphonic)", emoji: "🎭", audioUrl: "/valle-music.mp3" },
  { name: "Valle Pogradecit", emoji: "🏔️", audioUrl: "/valle-music.mp3" },
  { name: "Valle Malësorëve të Shkodrës", emoji: "⛰️", audioUrl: "/valle-music.mp3" },
  { name: "Shota e Korçës", emoji: "🎵", audioUrl: "/valle-music.mp3" },
  { name: "Valle Dibrane", emoji: "🪕", audioUrl: "/valle-music.mp3" },
  { name: "Kënga e Valles Arbereshe", emoji: "🇮🇹", audioUrl: "/valle-music.mp3" },
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
  const [gamePhase, setGamePhase] = useState<
    "waiting" | "myTurn" | "theirTurn" | "reviewing" | "finished"
  >("waiting");
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(10);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fromUserIdRef = useRef<string | null>(null);
  const toUserIdRef = useRef<string | null>(null);
  const currentRoundRef = useRef(1);
  const opponentVideoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && sessionId) {
      initializeGame();
      subscribeToGameUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // Attach camera stream to the video element whenever it (re-)mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [countdown, isRecording]);

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

  // Polling fallback: when stuck waiting for opponent's video, poll DB every 2s
  // This guarantees delivery even if broadcast and postgres_changes both miss
  useEffect(() => {
    if (gamePhase !== "theirTurn" || opponentVideoUrlRef.current) return;

    const poll = async () => {
      if (!sessionId || opponentVideoUrlRef.current) return;
      const { data } = await supabase
        .from("game_invites")
        .select("round1_video_url, round2_video_url")
        .eq("id", sessionId)
        .single();

      if (!data) return;
      const url = currentRoundRef.current === 1 ? data.round1_video_url : data.round2_video_url;
      if (url) {
        opponentVideoUrlRef.current = url;
        setOpponentVideoUrl(url);
        setGamePhase("reviewing");
        setShowReview(true);
      }
    };

    poll(); // immediate check
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [gamePhase, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopMusic();
    };
  }, []);

  // Manage blob URL lifecycle to prevent memory leak
  useEffect(() => {
    if (recordedVideo) {
      const url = URL.createObjectURL(recordedVideo);
      setRecordedVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setRecordedVideoUrl(null);
    }
  }, [recordedVideo]);

  // Auto-insert like when this player liked the opponent's dance
  useEffect(() => {
    if (gamePhase !== "finished" || !iLikedThem || !user || !opponent) return;
    supabase
      .rpc("like_user", {
        current_user_id: user.id,
        target_user_id: opponent.id,
      })
      .then(({ data, error }) => {
        if (error) {
          logger.error("Error recording like:", error);
          return;
        }
        const result = data as { success: boolean; is_match: boolean } | null;
        if (result?.is_match) {
          toast.success("It's a Match! 🎉", {
            description: `You and ${opponent.full_name} can now chat!`,
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, iLikedThem]);

  const initializeGame = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invite, error } = await (supabase as any)
        .from("game_invites")
        .select(
          `
          from_user_id,
          to_user_id,
          from_user:profiles!game_invites_from_user_id_fkey(id, full_name, age, profile_image_url, city),
          to_user:profiles!game_invites_to_user_id_fkey(id, full_name, age, profile_image_url, city)
        `
        )
        .eq("id", sessionId)
        .single();

      if (error) throw error;

      const opponentData = invite.from_user_id === user?.id ? invite.to_user : invite.from_user;

      setOpponent(opponentData);
      fromUserIdRef.current = invite.from_user_id;
      toUserIdRef.current = invite.to_user_id;
      setCurrentDancerId(invite.from_user_id);

      if (invite.from_user_id === user?.id) {
        setGamePhase("myTurn");
      } else {
        setGamePhase("theirTurn");
      }

      setLoading(false);
    } catch (error) {
      logger.error("Error initializing game:", error);
      toast.error("Failed to load dance challenge");
      navigate("/game-lobby");
    }
  };

  const subscribeToGameUpdates = () => {
    if (!sessionId) return;

    logger.log("🎮 Subscribing to game updates for session:", sessionId);
    const channelName = `dance-challenge-${sessionId}`;
    logger.log("🎮 Channel name:", channelName);

    // Unsubscribe from previous channel if exists
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on("broadcast", { event: "video_sent" }, async (payload) => {
        logger.log("📹 Received video_sent broadcast:", payload);
        const videoUrl = payload.payload.videoUrl;
        const senderId = payload.payload.senderId;

        // Don't show own video
        if (senderId !== user?.id) {
          logger.log("📹 Setting opponent video and showing review");
          opponentVideoUrlRef.current = videoUrl;
          setOpponentVideoUrl(videoUrl);
          setGamePhase("reviewing");
          setShowReview(true);
        }
      })
      // DB change subscription: reliable fallback if broadcast is missed
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_invites", filter: `id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          const round1Url = updated.round1_video_url as string | null;
          const round2Url = updated.round2_video_url as string | null;

          // Determine which round video just arrived and whether it's from the opponent
          const iAmDancer =
            (currentRoundRef.current === 1 && fromUserIdRef.current === user?.id) ||
            (currentRoundRef.current === 2 && toUserIdRef.current === user?.id);

          if (!iAmDancer) {
            const expectedUrl = currentRoundRef.current === 1 ? round1Url : round2Url;
            if (expectedUrl && !opponentVideoUrlRef.current) {
              logger.log(
                "📹 DB change: received opponent video URL for round",
                currentRoundRef.current
              );
              opponentVideoUrlRef.current = expectedUrl;
              setOpponentVideoUrl(expectedUrl);
              setGamePhase("reviewing");
              setShowReview(true);
            }
          }
        }
      )
      .on("broadcast", { event: "review_complete" }, async (payload) => {
        logger.log("✅ Review complete:", payload);
        const { liked, reviewerId, round } = payload.payload;

        const advanceToRound2 = () => {
          const newDancerId = toUserIdRef.current;
          setCurrentDancerId(newDancerId);
          setCurrentRound(2);
          currentRoundRef.current = 2;
          setRecordedVideo(null);
          setOpponentVideoUrl(null);
          opponentVideoUrlRef.current = null;
          setShowReview(false);
          if (user?.id === newDancerId) {
            setGamePhase("myTurn");
            toast.info("Round 2! Now it's your turn to dance! 💃");
          } else {
            setGamePhase("theirTurn");
            toast.info("Round 2 started! Waiting for their dance...");
          }
        };

        if (reviewerId !== user?.id) {
          // The opponent reviewed my dance this round
          setTheyLikedMe(liked);
          if (round === 1) {
            advanceToRound2();
          } else {
            setGamePhase("finished");
          }
        } else {
          // I just submitted my review
          if (round === 1) {
            advanceToRound2();
          } else {
            setShowReview(false);
            setGamePhase("finished");
          }
        }
      })
      .on("broadcast", { event: "game_cancelled" }, () => {
        toast.info("Opponent left the game");
        navigate("/game-lobby");
      })
      .subscribe((status) => {
        logger.log("📡 Channel subscription status:", status);
        if (status === "SUBSCRIBED") {
          logger.log("✅ Successfully subscribed to channel");
        }
      });

    channelRef.current = channel;

    return () => {
      logger.log("🔌 Unsubscribing from channel:", channelName);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  };

  const handleCancelGame = async () => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "game_cancelled",
        payload: { userId: user?.id },
      });
    }
    navigate("/game-lobby");
    toast.info("You left the game");
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCountdown(3);
    } catch (error) {
      logger.error("Error accessing camera:", error);
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
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
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
    const currentSong = VALLE_SONGS[(currentRoundRef.current - 1) % VALLE_SONGS.length];
    if (!currentSong.audioUrl) return;
    // Always fully destroy the previous instance before creating a new one
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    const audio = new Audio(currentSong.audioUrl);
    audio.loop = true;
    audio.volume = 0.5;
    audio.play().catch((err) => {
      logger.error("Error playing music:", err);
    });
    audioRef.current = audio;
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
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
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const sendVideo = async () => {
    if (!recordedVideo || !user || !sessionId) return;

    // Validate size before uploading (50 MB hard cap)
    const MAX_SIZE_MB = 50;
    if (recordedVideo.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(
        `Video is too large (${(recordedVideo.size / 1024 / 1024).toFixed(1)} MB). Please try again.`
      );
      setRecordedVideo(null);
      return;
    }

    toast.info("Uploading video...");

    // Upload video to Supabase Storage
    const filePath = `dance-challenges/${sessionId}/round${currentRound}-${user.id}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("dance-videos")
      .upload(filePath, recordedVideo, { upsert: true, contentType: "video/webm" });
    if (uploadError) {
      logger.error("Upload error:", uploadError);
      toast.error("Failed to upload video");
      return;
    }

    // Get signed URL for private bucket (valid for 1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("dance-videos")
      .createSignedUrl(filePath, 3600);

    if (signedError || !signedData) {
      logger.error("Signed URL error:", signedError);
      toast.error("Failed to generate video URL");
      return;
    }

    const videoUrl = signedData.signedUrl;

    // Persist the video URL in the DB — Postgres realtime will reliably notify the receiver
    // even if the broadcast below is missed (e.g. connection blip during upload)
    const videoColumn = currentRound === 1 ? "round1_video_url" : "round2_video_url";
    const { error: dbError } = await supabase
      .from("game_invites")
      .update({ [videoColumn]: videoUrl })
      .eq("id", sessionId);

    if (dbError) {
      logger.error("DB write error:", dbError);
      toast.error("Failed to save video. Please try again.");
      return;
    }

    // Also broadcast for low-latency delivery (belt-and-suspenders)
    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "video_sent",
        payload: { videoUrl, senderId: user.id, round: currentRound },
      });
    }

    setGamePhase("theirTurn");
    toast.success("Video sent! 🎥");
  };

  const reviewVideo = async (liked: boolean) => {
    if (!channelRef.current) {
      logger.error("❌ Channel not initialized!");
      toast.error("Connection error. Please refresh and try again.");
      return;
    }

    setILikedThem(liked);

    await channelRef.current.send({
      type: "broadcast",
      event: "review_complete",
      payload: {
        liked,
        reviewerId: user?.id,
        round: currentRound,
      },
    });

    setShowReview(false);

    if (liked) {
      toast.success("You liked their dance! 💃");
    } else {
      toast.info("Waiting for final results...");
    }
  };

  if (loading || !opponent) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Music className="h-16 w-16 text-orange-500 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading dance challenge...</p>
        </div>
      </div>
    );
  }

  const currentSong = VALLE_SONGS[(currentRound - 1) % VALLE_SONGS.length];

  return (
    <div className="min-h-dvh bg-gradient-to-br from-orange-50 to-yellow-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 space-y-6 shadow-card">
          {/* Cancel button */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelGame}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" /> Exit Game
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-4">
            <Music className="h-10 w-10 text-orange-500 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-orange-600">Dance Challenge 💃</h2>
            <p className="text-sm text-muted-foreground">Dance to Albanian Valle!</p>
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
          {gamePhase === "myTurn" && !recordedVideo && (
            <div className="text-center space-y-4">
              {/* Pre-camera: show start button */}
              {countdown === null && !isRecording && (
                <div className="space-y-4">
                  <p className="text-lg font-semibold">Your Turn! 🎵</p>
                  <p className="text-muted-foreground">
                    Dance to {currentSong.name} for 10 seconds
                  </p>
                  <Button
                    onClick={requestCamera}
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                  >
                    <Video className="mr-2" /> Start Dancing
                  </Button>
                </div>
              )}

              {/* Camera active: show live preview during countdown AND recording */}
              {(countdown !== null || isRecording) && (
                <div className="space-y-3">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full max-w-md mx-auto rounded-lg shadow-lg block [transform:scaleX(-1)]"
                    />
                    {/* Countdown overlay */}
                    {countdown !== null && countdown > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                        <p className="text-8xl font-bold text-white drop-shadow-lg">{countdown}</p>
                      </div>
                    )}
                    {/* Recording badge */}
                    {isRecording && (
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 text-white rounded-full px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-semibold">REC {recordingTime}s</span>
                      </div>
                    )}
                  </div>
                  {countdown !== null && (
                    <p className="text-center text-sm text-muted-foreground">Get ready to dance!</p>
                  )}
                </div>
              )}
            </div>
          )}

          {gamePhase === "myTurn" && recordedVideo && recordedVideoUrl && (
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold">Preview Your Dance 💃</p>
              <video
                src={recordedVideoUrl}
                controls
                className="w-full max-w-md mx-auto rounded-lg shadow-lg"
              />
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setRecordedVideo(null);
                    setGamePhase("myTurn");
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

          {gamePhase === "theirTurn" && (
            <div className="text-center py-12">
              <Music className="h-16 w-16 text-orange-500 animate-pulse mx-auto mb-4" />
              <p className="text-lg font-semibold">Your opponent is dancing...</p>
              <p className="text-sm text-muted-foreground mt-2">Get ready to review!</p>
            </div>
          )}

          {showReview && opponentVideoUrl && (
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold">Rate your opponent's Dance! 🎵</p>
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
                  className="w-24 h-24 rounded-full border-4 border-border hover:border-red-400 hover:bg-red-50"
                >
                  <div className="flex flex-col items-center">
                    <X className="h-8 w-8 text-muted-foreground" />
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

          {gamePhase === "finished" && (
            <div className="text-center space-y-6">
              {/* Profile reveal */}
              <div className="flex justify-center gap-8 mb-2">
                <div className="text-center">
                  <Avatar className="h-16 w-16 border-2 border-orange-400 mx-auto mb-1">
                    <AvatarImage src={opponent.profile_image_url || ""} />
                    <AvatarFallback>{opponent.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold">{opponent.full_name}</p>
                  {opponent.age && (
                    <p className="text-xs text-muted-foreground">
                      {opponent.age} • {opponent.city}
                    </p>
                  )}
                </div>
              </div>

              {iLikedThem && theyLikedMe ? (
                <>
                  <Trophy className="h-20 w-20 text-primary mx-auto animate-bounce" />
                  <h2 className="text-3xl font-bold text-primary">It's a Match! 🎉</h2>
                  <p className="text-xl text-foreground">
                    You both liked each other's dance moves!
                  </p>
                  <p className="text-muted-foreground">
                    A like has been automatically created. Check your matches to start chatting!
                  </p>
                </>
              ) : (
                <>
                  <Music className="h-20 w-20 text-muted-foreground mx-auto" />
                  <h2 className="text-3xl font-bold text-foreground">No Match</h2>
                  <p className="text-xl text-muted-foreground">
                    {!iLikedThem && !theyLikedMe && "Neither of you liked each other's dance"}
                    {iLikedThem && !theyLikedMe && "You liked them, but they passed"}
                    {!iLikedThem && theyLikedMe && "They liked you, but you passed"}
                  </p>
                  <p className="text-muted-foreground">Better luck next time!</p>
                </>
              )}

              <div className="flex gap-4 justify-center pt-6">
                <Button
                  onClick={() => navigate("/game-lobby")}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                >
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  Back to Lobby
                </Button>
                <Button onClick={() => navigate("/discover")} variant="outline">
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
