import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ArrowLeft, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  expires_at: string;
  created_at: string;
}

const Stories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMyStories = useCallback(async () => {
    if (!user) return;
    setLoadingStories(true);
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("id, media_url, media_type, caption, expires_at, created_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyStories((data as Story[]) || []);
    } catch (err) {
      logger.error("Failed to load stories", err);
    } finally {
      setLoadingStories(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyStories();
  }, [fetchMyStories]);

  const handleDelete = async (story: Story) => {
    if (!user) return;
    setDeletingId(story.id);
    try {
      // Extract storage path from URL
      const url = new URL(story.media_url);
      const pathMatch = url.pathname.match(/\/stories\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from("stories").remove([pathMatch[1]]);
      }
      const { error } = await supabase.from("stories").delete().eq("id", story.id);
      if (error) throw error;
      setMyStories((prev) => prev.filter((s) => s.id !== story.id));
      toast.success(t("stories.storyDeleted"));
    } catch (err) {
      logger.error("Delete failed", err);
      toast.error(t("stories.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (file: File) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setUploading(true);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/story-${Date.now()}.${extension}`;
      const { data, error } = await supabase.storage
        .from("stories")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(data.path);

      const mediaUrl = urlData.publicUrl;
      const mediaType = file.type.startsWith("video") ? "video" : "image";

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_type: mediaType,
        media_url: mediaUrl,
        caption: caption || null,
        duration: mediaType === "video" ? null : 8,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (insertError) throw insertError;
      toast.success(t("stories.storyPosted"));
      setCaption("");
      fetchMyStories();
    } catch (error) {
      logger.error("Story upload failed", error);
      toast.error(t("stories.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Camera className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("stories.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("stories.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("stories.back")}
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <Textarea
            placeholder={t("stories.caption")}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={2}
          />
          <Input
            type="file"
            accept="image/*,video/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
            }}
            disabled={uploading}
          />
          <Button className="w-full" disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? t("stories.uploading") : t("stories.upload")}
          </Button>
          <p className="text-xs text-muted-foreground text-center">{t("stories.hint")}</p>
        </Card>

        {/* My active stories */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">{t("stories.myActiveStories")}</h2>
          {loadingStories ? (
            <p className="text-sm text-muted-foreground">{t("stories.loading")}</p>
          ) : myStories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("stories.noStories")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myStories.map((story) => (
                <div
                  key={story.id}
                  className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black"
                >
                  {story.media_type === "video" ? (
                    <video
                      src={story.media_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={story.media_url}
                      alt={story.caption || "Story"}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {story.caption && (
                    <p className="absolute bottom-8 left-2 right-2 text-white text-xs font-medium line-clamp-2">
                      {story.caption}
                    </p>
                  )}
                  <p className="absolute bottom-2 left-2 text-white/60 text-[10px]">
                    {t("stories.expires")}{" "}
                    {new Date(story.expires_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-90"
                    disabled={deletingId === story.id}
                    onClick={() => handleDelete(story)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Stories;
