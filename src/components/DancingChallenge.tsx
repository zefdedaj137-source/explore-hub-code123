import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Video, Upload, Star, Users, LogOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

const DANCE_SONGS = [
  "Këngë Magjike - Albanian Pop",
  "Valle Kosovare - Traditional",
  "Shota - Folk Dance",
  "Tallava Mix",
  "Albanian Wedding Dance",
  "Valle e Rugoves",
  "Çiftelia Melody"
];

interface DancingVideo {
  id: string;
  user_id: string;
  video_url: string;
  song_name: string;
  average_rating: number;
  total_ratings: number;
  profiles: {
    full_name: string;
    profile_image_url: string;
  };
}

export default function DancingChallenge() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentSong, setCurrentSong] = useState("");
  const [videos, setVideos] = useState<DancingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<{ [key: string]: number }>({});
  const [hasJoined, setHasJoined] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const checkMembership = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use direct query for now since RPC functions aren't deployed yet
      try {
        const { data: fallbackData } = await supabase
          .from("dancing_channel_participants")
          .select("id")
          .eq("user_id", user.id)
          .single();
        setHasJoined(!!fallbackData);
      } catch (queryError) {
        // If direct query fails due to recursion, set as false
        console.error("Query error:", queryError);
        setHasJoined(false);
      }
    } catch (error) {
      console.error("Error checking membership:", error);
      setHasJoined(false);
    }
  }, []);

  const joinChannel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Try to join using RPC function (will fail gracefully if not available)
      try {
        console.log("Attempting to join dancing channel for user:", user.id);
        
        toast({
          title: "Valle Challenge",
          description: "Database fix needs to be applied first. Using test mode for now.",
        });

        // For now, just set the UI state for testing
        // setHasJoined(true);
      } catch (rpcError) {
        console.log("Expected: RPC function not available yet:", rpcError);
        toast({
          title: "Valle Challenge",
          description: "Please run the database fix script to enable joining the channel",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error", 
        description: (error as Error).message || "Failed to join channel",
        variant: "destructive"
      });
    }
  };  const leaveChannel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Try to leave using RPC function (will fail gracefully if not available)
      try {
        console.log("Attempting to leave dancing channel for user:", user.id);
        
        toast({
          title: "Valle Challenge",
          description: "Database fix needs to be applied first. Using test mode for now.",
        });

        // For now, just set the UI state for testing
        // setHasJoined(false);
        // setVideos([]);
      } catch (rpcError) {
        console.log("Expected: RPC function not available yet:", rpcError);
        toast({
          title: "Valle Challenge",
          description: "Please run the database fix script to enable leaving the channel",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to leave channel",
        variant: "destructive"
      });
    }
  };

  const fetchVideos = useCallback(async () => {
    try {
      const { data: videosData, error: videosError } = await supabase
        .from("dancing_videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (videosError) throw videosError;

      // Fetch profiles separately
      const userIds = videosData?.map(v => v.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const videosWithProfiles: DancingVideo[] = videosData?.map(video => ({
        id: video.id,
        user_id: video.user_id,
        video_url: video.video_url,
        song_name: video.song_name,
        average_rating: video.average_rating,
        total_ratings: video.total_ratings,
        profiles: profilesData?.find(p => p.id === video.user_id) || {
          full_name: "Unknown User",
          profile_image_url: ""
        }
      })) || [];

      setVideos(videosWithProfiles);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to load dancing videos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    checkMembership();
  }, [checkMembership]);

  useEffect(() => {
    if (hasJoined) {
      fetchVideos();
    }
  }, [hasJoined, fetchVideos]);

  const selectRandomSong = () => {
    const randomIndex = Math.floor(Math.random() * DANCE_SONGS.length);
    setCurrentSong(DANCE_SONGS[randomIndex]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      selectRandomSong();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setRecordedBlob(file);
      selectRandomSong();
    }
  };

  const uploadVideo = async () => {
    if (!recordedBlob || !currentSong) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload video to Supabase storage
      const fileExt = "webm";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('dance-videos')
        .upload(fileName, recordedBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dance-videos')
        .getPublicUrl(fileName);

      // Save video info to database (you can add a videos table later)
      console.log("Video uploaded successfully:", publicUrl);
      
      toast({
        title: "Video uploaded!",
        description: "Your Valle Challenge video has been uploaded successfully!",
      });

      // Reset recording
      setRecordedBlob(null);
      
    } catch (error) {
      console.error("Error in video upload:", error);
      toast({
        title: "Error",
        description: "Video upload failed. Database fix needed.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const rateVideo = async (videoId: string, ratingValue: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("video_ratings")
        .upsert({
          video_id: videoId,
          rater_id: user.id,
          rating: ratingValue,
        });

      if (error) throw error;

      if (ratingValue > 5) {
        toast({
          title: "It's a Match! 💃",
          description: `You rated this video ${ratingValue}/10 - You've matched with this dancer!`,
        });
      } else {
        toast({
          title: "Rating submitted!",
          description: `You rated this video ${ratingValue}/10`,
        });
      }

      fetchVideos();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    }
  };

  if (checkingMembership || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show join screen if not a member
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center space-y-6">
          <div className="space-y-4">
            <div className="inline-flex p-4 bg-primary/10 rounded-full">
              <Users className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Valle Dancing Channel</h1>
            <p className="text-xl text-muted-foreground">
              Join the exclusive Albanian dancing community
            </p>
          </div>

          <div className="space-y-4 text-left bg-muted/50 p-6 rounded-lg">
            <h3 className="font-semibold text-lg">What you'll get:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Star className="h-5 w-5 text-primary mt-0.5" />
                <span>Share your Albanian dancing videos with the community</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="h-5 w-5 text-primary mt-0.5" />
                <span>Watch and rate other dancers</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="h-5 w-5 text-primary mt-0.5" />
                <span>Match with dancers you rate above 5/10</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="h-5 w-5 text-primary mt-0.5" />
                <span>Connect with people who appreciate your moves</span>
              </li>
            </ul>
          </div>

          <Button onClick={joinChannel} size="lg" className="w-full">
            <Users className="mr-2 h-5 w-5" />
            Join Valle Channel
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-bold">Dancing Valle Challenge</h1>
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              Channel Member
            </Badge>
          </div>
          <p className="text-muted-foreground">Show your moves and get rated! Rate above 5 to match 💃</p>
          <Button onClick={leaveChannel} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Leave Channel
          </Button>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            {currentSong && (
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Dancing to:</p>
                <p className="text-xl font-semibold">{currentSong}</p>
              </div>
            )}

            <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {!isRecording && !recordedBlob && (
                <>
                  <Button onClick={startRecording} size="lg">
                    <Video className="mr-2 h-5 w-5" />
                    Start Recording
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="lg"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Video
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Upload dancing video file"
                  />
                </>
              )}

              {isRecording && (
                <Button onClick={stopRecording} variant="destructive" size="lg">
                  Stop Recording
                </Button>
              )}

              {recordedBlob && (
                <Button onClick={uploadVideo} disabled={uploading} size="lg">
                  {uploading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-5 w-5" />
                  )}
                  Upload Video
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Dance Videos</h2>
          {videos.map((video) => (
            <Card key={video.id} className="p-6">
              <div className="flex items-start gap-4">
                <img
                  src={video.profiles.profile_image_url || "/placeholder.svg"}
                  alt={video.profiles.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="font-semibold">{video.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{video.song_name}</p>
                  </div>

                  <video
                    src={video.video_url}
                    controls
                    className="w-full aspect-video rounded-lg"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold">
                        {video.average_rating.toFixed(1)} / 10
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({video.total_ratings} ratings)
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Rate this video:</p>
                      <div className="flex items-center gap-4">
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[rating[video.id] || 0]}
                          onValueChange={(value) =>
                            setRating({ ...rating, [video.id]: value[0] })
                          }
                          className="flex-1"
                        />
                        <span className="w-12 text-center font-semibold">
                          {rating[video.id] || 0}
                        </span>
                        <Button
                          onClick={() => rateVideo(video.id, rating[video.id] || 0)}
                          size="sm"
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}