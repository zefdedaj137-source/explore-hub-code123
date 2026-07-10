import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Music2, Trash2, Link2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

type SoundtrackSource = "youtube" | "spotify" | null;

/** Extract YouTube video ID from various URL formats */
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

/** Extract Spotify track ID from URL */
const extractSpotifyTrackId = (url: string): string | null => {
  const m = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
};

const detectSource = (url: string): { source: SoundtrackSource; embedId: string | null } => {
  const ytId = extractYouTubeId(url);
  if (ytId) return { source: "youtube", embedId: ytId };
  const spId = extractSpotifyTrackId(url);
  if (spId) return { source: "spotify", embedId: spId };
  return { source: null, embedId: null };
};

const ProfileSoundtrack = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [source, setSource] = useState<SoundtrackSource>(null);
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSoundtrack = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("soundtrack_title, soundtrack_artist, soundtrack_url, soundtrack_source")
        .eq("id", user.id)
        .single();

      if (data) {
        setSongTitle(data.soundtrack_title || "");
        setSongArtist(data.soundtrack_artist || "");
        setSongUrl(data.soundtrack_url || "");
        setSource((data.soundtrack_source as SoundtrackSource) || null);
        if (data.soundtrack_url) {
          const { embedId: id } = detectSource(data.soundtrack_url);
          setEmbedId(id);
        }
      }
    } catch (err) {
      logger.error("Error loading soundtrack:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSoundtrack();
  }, [loadSoundtrack]);

  const handleUrlChange = (url: string) => {
    setSongUrl(url);
    const { source: s, embedId: id } = detectSource(url);
    setSource(s);
    setEmbedId(id);
  };

  const save = async () => {
    if (!user) return;
    if (songUrl && !source) {
      toast.error(t("profileSoundtrack.invalidLink"));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          soundtrack_title: songTitle || null,
          soundtrack_artist: songArtist || null,
          soundtrack_url: songUrl || null,
          soundtrack_source: source || null,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success(t("profileSoundtrack.saved"));
    } catch (err) {
      logger.error("Error saving soundtrack:", err);
      toast.error(t("profileSoundtrack.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const removeSoundtrack = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          soundtrack_title: null,
          soundtrack_artist: null,
          soundtrack_url: null,
          soundtrack_source: null,
        })
        .eq("id", user.id);

      setSongTitle("");
      setSongArtist("");
      setSongUrl("");
      setSource(null);
      setEmbedId(null);
      toast.success(t("profileSoundtrack.removed"));
    } catch (err) {
      logger.error(err);
      toast.error(t("profileSoundtrack.failedRemove"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-card to-background flex items-center justify-center">
        <Music2 className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-card to-background pb-24">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Music2 className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">{t("profileSoundtrack.title")}</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Header card */}
        <Card className="p-5 bg-gradient-to-br from-primary/15 to-primary/5 text-center border-primary/20">
          <Music2 className="h-12 w-12 mx-auto text-primary mb-2" />
          <h2 className="font-bold text-lg">{t("profileSoundtrack.yourThemeSong")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("profileSoundtrack.addTrackDesc")}
          </p>
        </Card>

        {/* Paste Link */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> {t("profileSoundtrack.pasteLink")}
          </h2>
          <Input
            placeholder={t("profileSoundtrack.musicUrlHint")}
            value={songUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
          />

          {source && (
            <div className="flex items-center gap-2 text-sm">
              {source === "youtube" && (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
                  </svg>
                  {t("profileSoundtrack.youtubeDetected")}
                </span>
              )}
              {source === "spotify" && (
                <span className="flex items-center gap-1 text-green-500 font-medium">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.4-1 .2-2.7-1.6-6-2-10-1.1-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 4.3-1 8.1-.6 11.1 1.2.4.3.5.7.3 1.1zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.9-7.7-2.4-11.3-1.3-.4.1-.9-.1-1.1-.6-.1-.4.1-.9.6-1.1 4.1-1.3 9.2-.7 12.7 1.5.4.2.5.8.3 1.2zm.1-3.4c-3.7-2.2-9.7-2.4-13.2-1.3-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 4-1.2 10.7-1 14.9 1.5.5.3.6.9.4 1.4-.3.4-.9.6-1.4.3z" />
                  </svg>
                  {t("editProfile.spotifyDetected")}
                </span>
              )}
            </div>
          )}

          {songUrl && !source && songUrl.length > 10 && (
            <p className="text-sm text-destructive">
              {t("profileSoundtrack.couldNotDetectYoutubeOrSpotify")}
            </p>
          )}
        </Card>

        {/* Song Details */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold">{t("profileSoundtrack.songDetails")}</h2>
          <Input
            placeholder={t("profileSoundtrack.songTitle")}
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
          />
          <Input
            placeholder={t("profileSoundtrack.artist")}
            value={songArtist}
            onChange={(e) => setSongArtist(e.target.value)}
          />
        </Card>

        {/* Preview */}
        {embedId && source && (
          <Card className="p-4 space-y-3 border-primary/20">
            <h2 className="font-semibold flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" /> {t("common.preview")}
            </h2>
            {source === "youtube" && (
              <div className="rounded-xl overflow-hidden aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${embedId}`}
                  title={t("profileSoundtrack.youtubePlayer")}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {source === "spotify" && (
              <div className="rounded-xl overflow-hidden">
                <iframe
                  src={`https://open.spotify.com/embed/track/${embedId}?theme=0`}
                  title={t("profileSoundtrack.spotifyPlayer")}
                  className="w-full"
                  height="152"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}
            {(songTitle || songArtist) && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {songTitle || t("profileSoundtrack.untitled")}
                  </p>
                  <p className="text-xs text-muted-foreground">{songArtist || ""}</p>
                </div>
                <button
                  onClick={removeSoundtrack}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t("profileSoundtrack.removeSoundtrack")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Existing soundtrack without preview */}
        {!embedId && songUrl && source && (
          <Card className="p-4 space-y-3 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-sm">
                    {songTitle || t("profileSoundtrack.untitled")}
                  </p>
                  <p className="text-xs text-muted-foreground">{songArtist || source}</p>
                </div>
              </div>
              <button
                onClick={removeSoundtrack}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={t("profileSoundtrack.removeSoundtrack")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        )}

        <Button
          onClick={save}
          disabled={saving}
          className="w-full bg-gradient-to-r from-primary to-[hsl(15,100%,60%)] hover:brightness-110 text-white rounded-full h-12 text-base font-semibold"
        >
          {saving ? t("common.saving") : t("profileSoundtrack.save")}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfileSoundtrack;
