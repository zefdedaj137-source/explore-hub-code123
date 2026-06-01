import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, ArrowLeft, Upload, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

const VideoIntro = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [customUrl, setCustomUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("video_intro_url")
      .eq("id", user.id)
      .single();
    if (error) return;
    setVideoUrl(data?.video_intro_url || "");
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const extension = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/intro-${Date.now()}.${extension}`;
      const { data, error } = await supabase.storage
        .from("profile-videos")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("profile-videos").getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ video_intro_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setVideoUrl(publicUrl);
      setCustomUrl("");
      toast.success(t("videoIntro.videoUpdated"));
    } catch (error) {
      logger.error("Video upload failed", error);
      toast.error(t("videoIntro.failedUpload"));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!user || !customUrl) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ video_intro_url: customUrl })
        .eq("id", user.id);
      if (error) throw error;
      setVideoUrl(customUrl);
      toast.success(t("videoIntro.videoLinkSaved"));
    } catch (error) {
      logger.error("Save video intro failed", error);
      toast.error(t("videoIntro.failedSaveLink"));
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ video_intro_url: null })
      .eq("id", user.id);
    if (error) {
      toast.error(t("videoIntro.failedRemove"));
      return;
    }
    setVideoUrl("");
    toast.success(t("videoIntro.videoRemoved"));
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Video className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("videoIntro.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("videoIntro.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <h2 className="text-lg font-semibold">{t("videoIntro.uploadVideo")}</h2>
          <Input
            type="file"
            accept="video/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
            }}
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground">
            Tip: Create a storage bucket named "profile-videos" with public access for preview.
          </p>
          <Button className="w-full" disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? t("videoIntro.uploading") : t("videoIntro.uploadFromDevice")}
          </Button>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <h2 className="text-lg font-semibold">{t("videoIntro.pasteLink")}</h2>
          <Input
            placeholder={t("videoIntro.urlPlaceholder")}
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
          />
          <Button className="w-full" onClick={handleSaveUrl} disabled={!customUrl}>
            <Link2 className="h-4 w-4 mr-2" />
            {t("videoIntro.saveLink")}
          </Button>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <h2 className="text-lg font-semibold">{t("videoIntro.preview")}</h2>
          {videoUrl ? (
            <>
              <video src={videoUrl} controls className="w-full rounded-2xl" />
              <Button variant="outline" className="w-full" onClick={handleRemove}>
                {t("videoIntro.removeVideo")}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("videoIntro.noVideoYet")}</p>
          )}
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default VideoIntro;
