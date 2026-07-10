import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Upload, Music, Play, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DANCE_SONGS = [
  "Valle e Veriut",
  "Çamçe",
  "Jorgovan",
  "Valle Gjirokastrite",
  "Shota",
  "Tropoja",
  "Opinga",
  "Labëria",
  "Rugova",
  "Valle Pogradeci",
];

export const VideoRecorder = ({ onVideoUploaded }: { onVideoUploaded: () => void }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [currentSong, setCurrentSong] = useState("");
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRandomSong = () => {
    return DANCE_SONGS[Math.floor(Math.random() * DANCE_SONGS.length)];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        await uploadVideo(blob);

        stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      const newSong = getRandomSong();
      setCurrentSong(newSong);
      mediaRecorder.start();
      setIsRecording(true);

      toast.success(t("dancing.danceTo", { song: newSong }));
    } catch (error) {
      toast.error(t("videoIntro.cameraError"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async (videoBlob: Blob) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("dance-videos")
        .upload(fileName, videoBlob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("dance-videos").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("dancing_videos").insert({
        user_id: user.id,
        video_url: publicUrl,
        song_name: currentSong,
      });

      if (dbError) throw dbError;

      toast.success(t("videoIntro.danceUploaded"));
      onVideoUploaded();
    } catch (error) {
      toast.error(t("videoIntro.failedUploadVideo"));
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const newSong = getRandomSong();
    setCurrentSong(newSong);
    setUploading(true);

    try {
      const fileName = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;

      const { error: uploadError } = await supabase.storage
        .from("dance-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("dance-videos").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("dancing_videos").insert({
        user_id: user.id,
        video_url: publicUrl,
        song_name: newSong,
      });

      if (dbError) throw dbError;

      toast.success(t("dancing.videoUploaded", { song: newSong }));
      onVideoUploaded();
    } catch (error) {
      toast.error(t("videoIntro.failedUploadVideo"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-bold">{t("dancing.recordValle")}</h3>
        </div>

        {currentSong && (
          <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg">
            <Music className="h-5 w-5 text-accent" />
            <span className="font-semibold">
              {t("dancing.dancingTo")} {currentSong}
            </span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full aspect-video bg-gradient-to-br from-muted to-muted rounded-lg"
        />

        <div className="flex gap-3">
          {!isRecording ? (
            <>
              <Button
                onClick={startRecording}
                className="flex-1 bg-gradient-primary"
                disabled={uploading}
              >
                <Play className="h-5 w-5 mr-2" />
                {t("dancingChallenge.startRecording")}
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1"
                disabled={uploading}
              >
                <Upload className="h-5 w-5 mr-2" />
                {t("dancingChallenge.uploadVideo")}
              </Button>
              <input
                ref={fileInputRef}
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                aria-label={t("dancing.uploadVideo")}
                className="hidden"
              />
            </>
          ) : (
            <Button onClick={stopRecording} variant="destructive" className="flex-1">
              <StopCircle className="h-5 w-5 mr-2" />
              {t("chatInput.stopRecording")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
