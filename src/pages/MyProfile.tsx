import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Settings,
  Plus,
  MapPin,
  Crown,
  Heart,
  Zap,
  Phone,
  Eye,
  Users,
  Sparkles,
  Smile,
  Music2,
  Camera,
  Info,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import BottomNav from "@/components/BottomNav";
import { ACHIEVEMENTS, getUserAchievements, checkAndGrantAchievements } from "@/lib/achievements";

interface Profile {
  id: string;
  full_name: string;
  age: number;
  city: string | null;
  country: string | null;
  profile_image_url: string | null;
  profile_images?: string[];
  bio?: string | null;
  interests?: string[];
  verified?: boolean | null;
  work?: string | null;
  education?: string | null;
  height?: string | null;
  height_cm?: number | null;
  zodiac_sign?: string | null;
  religion?: string | null;
  looking_for?: string[];
  lifestyle?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  pets?: string | null;
  is_premium: boolean;
  video_intro_url?: string | null;
  mood_emoji?: string | null;
  mood_text?: string | null;
  soundtrack_title?: string | null;
  soundtrack_artist?: string | null;
  soundtrack_url?: string | null;
  soundtrack_source?: string | null;
}

interface StoryItem {
  id: string;
  media_type: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
};

const extractSpotifyTrackId = (url: string): string | null => {
  const m = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
};

const formatTimeAgo = (timestamp: string, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffInSeconds < 60) return t("common.justNow");
  if (diffInSeconds < 3600) return t("common.minutesAgo", { min: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t("common.hoursAgo", { hr: Math.floor(diffInSeconds / 3600) });
  return t("common.daysAgo", { day: Math.floor(diffInSeconds / 86400) });
};

const MyProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [streak, setStreak] = useState(1);
  const [myStories, setMyStories] = useState<StoryItem[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    if (error) {
      logger.error("Error fetching profile:", error);
      toast.error(t("profile.failedLoad"));
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, [user, t]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();

    // Defer achievements check until browser is idle — avoids blocking initial paint
    const runAchievements = () => {
      checkAndGrantAchievements(user.id).then((newBadges) => {
        if (newBadges.length > 0) {
          newBadges.forEach((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            if (a) toast.success(`${a.icon} Achievement Unlocked: ${a.name}`);
          });
        }
        getUserAchievements(user.id).then(setEarnedBadges);
      });
    };
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(runAchievements, { timeout: 3000 });
    } else {
      setTimeout(runAchievements, 500);
    }
  }, [user, navigate, fetchProfile]);

  useEffect(() => {
    const key = "daily_streak_v1";
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const stored = localStorage.getItem(key);
    if (!stored) {
      localStorage.setItem(key, JSON.stringify({ lastDate: todayKey, streak: 1 }));
      setStreak(1);
      return;
    }

    const parsed = JSON.parse(stored) as { lastDate: string; streak: number };
    const diffDays =
      todayKey === parsed.lastDate
        ? 0
        : todayKey ===
            new Date(new Date(parsed.lastDate).getTime() + 86400000).toISOString().slice(0, 10)
          ? 1
          : 2;

    if (diffDays === 0) {
      setStreak(parsed.streak);
      return;
    }

    const newStreak = diffDays === 1 ? parsed.streak + 1 : 1;
    localStorage.setItem(key, JSON.stringify({ lastDate: todayKey, streak: newStreak }));
    setStreak(newStreak);
  }, []);

  // Fetch my active stories
  useEffect(() => {
    if (!user) return;
    const now = new Date().toISOString();
    supabase
      .from("stories")
      .select("id, media_type, media_url, caption, created_at, expires_at")
      .eq("user_id", user.id)
      .gt("expires_at", now)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMyStories((data as StoryItem[]) || []);
      });
  }, [user]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    setUploading(true);

    try {
      // First, fetch current profile_images array
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("profile_images")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      const existingImages = profileData?.profile_images || [];

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Add new image to the beginning of the array (as main photo)
      const updatedImages = [urlData.publicUrl, ...existingImages];

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          profile_image_url: urlData.publicUrl,
          // Keep existing images and add new one as first
          profile_images: updatedImages,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success(t("profile.photoUpdated"));
      // Refetch to get the updated profile
      await fetchProfile();
    } catch (error) {
      logger.error("Error uploading image:", error);
      toast.error(t("profile.failedUploadPhoto"));
    } finally {
      setUploading(false);
    }
  };

  const completionItems = profile
    ? [
        {
          label: t("profile.addPhoto"),
          done: !!profile.profile_image_url,
          action: "/edit-profile",
          tip: t("profile.photoTip"),
        },
        {
          label: t("profile.addBio"),
          done: !!profile.bio,
          action: "/edit-profile",
          tip: t("profile.bioTip"),
        },
        {
          label: t("profile.addInterests"),
          done: (profile.interests || []).length >= 3,
          action: "/edit-profile",
          tip: t("profile.interestsTip"),
        },
        {
          label: t("profile.verifyAccount"),
          done: !!profile.verified,
          action: "/verification",
          tip: t("profile.verificationTip"),
        },
        {
          label: t("profile.addWork"),
          done: !!profile.work || !!profile.education,
          action: "/edit-profile",
          tip: t("profile.workTip"),
        },
      ]
    : [];

  const completedCount = completionItems.filter((item) => item.done).length;
  const completionPercent =
    completionItems.length > 0 ? Math.round((completedCount / completionItems.length) * 100) : 0;
  const nextIncompleteItem = completionItems.find((item) => !item.done);
  const progressColor =
    completionPercent >= 80
      ? "from-green-500 to-emerald-500"
      : completionPercent >= 60
        ? "from-yellow-500 to-amber-500"
        : completionPercent >= 40
          ? "from-orange-500 to-amber-500"
          : "from-red-500 to-rose-500";

  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${completionPercent}%`;
    }
  }, [completionPercent]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("profile.profileNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-20 page-bg">
      {/* Header */}
      <div className="container mx-auto max-w-2xl p-4">
        <div className="rounded-2xl p-5 mb-6 glass-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/eagle-logo.png" alt="Shqiponja" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold text-primary">Shqiponja</span>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label={t("profile.goBack")}
            >
              <ArrowLeft className="h-6 w-6 text-primary/80" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Completion */}
        <Card
          className={`p-6 rounded-2xl border-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-gradient-to-br from-card to-background ${completionPercent < 80 ? "border-primary/50" : "border-border"}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("profile.profileCompletion")}
            </h2>
            <Badge className={`bg-gradient-to-r ${progressColor} text-white border-none`}>
              {completionPercent}%
            </Badge>
          </div>
          <div className="w-full h-2 mb-3 rounded-full bg-primary/10 overflow-hidden">
            <div
              ref={progressBarRef}
              className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-500 rounded-full`}
            />
          </div>
          {completionPercent < 80 && nextIncompleteItem && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-0.5">{t("profile.nextStep")}</p>
              <p className="font-semibold text-sm text-foreground">{nextIncompleteItem.label}</p>
              <p className="text-xs text-primary mt-0.5">{nextIncompleteItem.tip}</p>
            </div>
          )}
          <ul className="space-y-2 text-sm text-foreground mb-4">
            {completionItems.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${item.done ? "bg-green-500" : "bg-muted"}`}
                />
                <span className={item.done ? "line-through text-muted-foreground" : ""}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          {completionPercent < 100 && (
            <Button
              className={`w-full bg-gradient-to-r ${progressColor} text-white font-semibold hover:opacity-90`}
              onClick={() => navigate(nextIncompleteItem?.action || "/edit-profile")}
            >
              {completionPercent < 80 ? t("profile.boostYourProfile") : t("profile.finishProfile")}
            </Button>
          )}
        </Card>

        {/* Daily Streak */}
        <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("profile.dailyStreak")}</h2>
              <p className="text-sm text-muted-foreground">{t("profile.keepStreakGoing")}</p>
            </div>
            <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
              {streak} {t("profile.days")}
            </Badge>
          </div>
        </Card>

        {/* Profile Picture Section */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-border shadow-xl">
              <AvatarImage src={profile.profile_image_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/90 text-white text-4xl font-bold">
                {profile.full_name[0]}
              </AvatarFallback>
            </Avatar>

            {/* Upload Button */}
            <label
              htmlFor="profile-upload"
              className="absolute bottom-0 right-0 bg-gradient-to-r from-primary to-primary/90 text-white rounded-full p-2 cursor-pointer hover:from-primary hover:to-primary shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
                aria-label={t("profile.uploadPicture")}
              />
            </label>
          </div>

          {/* Name and Age */}
          <h2 className="text-2xl font-bold text-foreground mt-4">
            {profile.full_name}, {profile.age}
          </h2>

          {/* Mood Status */}
          <button
            onClick={() => navigate("/mood-status")}
            className="mt-2 flex items-center gap-2 bg-primary/20 hover:bg-primary/30 px-4 py-1.5 rounded-full transition-colors"
          >
            {profile.mood_emoji ? (
              <>
                <span className="text-lg">{profile.mood_emoji}</span>
                <span className="text-sm text-primary/60">
                  {profile.mood_text || t("profile.setYourMood")}
                </span>
              </>
            ) : (
              <>
                <Smile className="h-4 w-4 text-primary/80" />
                <span className="text-sm text-primary/80">{t("profile.setYourMood")}</span>
              </>
            )}
          </button>

          {/* Location */}
          {(profile.city || profile.country) && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>
                {profile.city}
                {profile.city && profile.country && ", "}
                {profile.country}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Button
              onClick={() => navigate("/edit-profile")}
              className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white px-6"
            >
              {t("profile.editProfile")}
            </Button>
            <Button
              onClick={() => {
                setPreviewImageIndex(0);
                setShowPreview(true);
              }}
              variant="outline"
              className="px-6"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t("profile.preview")}
            </Button>
            <Button onClick={() => navigate("/stories")} variant="outline" className="px-6">
              <Camera className="h-4 w-4 mr-2" />
              {t("profile.story")}
            </Button>
            <Button onClick={() => navigate("/settings")} variant="outline" className="px-6">
              <Settings className="h-4 w-4 mr-2" />
              {t("profile.settings")}
            </Button>
            <Button
              onClick={async () => {
                const shareData = {
                  title: `${profile.full_name} on Shqiponja`,
                  text: `Check out ${profile.full_name}'s profile on Shqiponja!`,
                  url: `${window.location.origin}/profile/${profile.id}`,
                };
                if (navigator.share) {
                  try {
                    await navigator.share(shareData);
                  } catch {
                    /* cancelled */
                  }
                } else {
                  await navigator.clipboard.writeText(shareData.url);
                  toast.success(t("profile.linkCopied"));
                }
              }}
              variant="outline"
              className="px-6"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {t("profile.share")}
            </Button>
          </div>

          {/* Achievement Badges */}
          {earnedBadges.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> {t("profile.achievements", { earned: earnedBadges.length, total: ACHIEVEMENTS.length })}
              </h3>
              <div className="flex flex-wrap gap-2">
                {ACHIEVEMENTS.map((a) => {
                  const earned = earnedBadges.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                        earned
                          ? "bg-primary/10 border-primary/30 text-foreground"
                          : "bg-muted/30 border-border text-muted-foreground/50 opacity-50"
                      }`}
                      title={a.description}
                    >
                      <span>{a.icon}</span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile Soundtrack */}
        {profile.soundtrack_url &&
          profile.soundtrack_source &&
          (() => {
            const ytMatch =
              profile.soundtrack_source === "youtube" &&
              profile.soundtrack_url?.match(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
              );
            const spMatch =
              profile.soundtrack_source === "spotify" &&
              profile.soundtrack_url?.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
            const ytId = ytMatch ? ytMatch[1] : null;
            const spId = spMatch ? spMatch[1] : null;
            if (!ytId && !spId) return null;
            return (
              <Card className="overflow-hidden border-primary/20">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Music2 className="h-5 w-5 text-primary" />
                      {t("profile.mySoundtrack")}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/profile-soundtrack")}
                      className="text-xs text-muted-foreground"
                    >
                      {t("common.edit")}
                    </Button>
                  </div>
                  {(profile.soundtrack_title || profile.soundtrack_artist) && (
                    <p className="text-sm text-muted-foreground">
                      {profile.soundtrack_title}
                      {profile.soundtrack_artist ? ` \u2014 ${profile.soundtrack_artist}` : ""}
                    </p>
                  )}
                  {ytId && (
                    <div className="rounded-xl overflow-hidden aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title="My soundtrack"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {spId && (
                    <div className="rounded-xl overflow-hidden">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${spId}?theme=0`}
                        title="My soundtrack"
                        className="w-full"
                        height="152"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}

        {/* No soundtrack - show add button */}
        {!profile.soundtrack_url && (
          <button
            onClick={() => navigate("/profile-soundtrack")}
            className="w-full flex items-center gap-3 p-4 bg-card border border-dashed border-primary/30 rounded-xl hover:border-primary/50 transition-colors"
          >
            <Music2 className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t("profile.addThemeSong")}</span>
            <Plus className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
        )}

        {/* Premium Features Card */}
        {!profile.is_premium && (
          <Card className="bg-background border-2 border-primary/30 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="h-6 w-6 text-primary animate-pulse" />
                <h3 className="text-xl font-bold text-foreground">
                  {t("profile.getPremiumTitle")}
                </h3>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 bg-card/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] rounded-full p-2">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t("profile.seeWhoLiked")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.noMoreGuessing")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-card/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] rounded-full p-2">
                    <Zap className="h-5 w-5 text-white" fill="currentColor" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t("profile.freeBoostsMonthly")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.get10xViews")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-card/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-2">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t("profile.unlimitedCallsVideo")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.connectDeeper")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-card/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] rounded-full p-2">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t("profile.advancedFilters")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.filterAdvanced")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-card/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-primary to-primary rounded-full p-2">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t("profile.unlimitedSwipes")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.neverRunOut")}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate("/premium")}
                className="w-full bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white text-lg py-6 shadow-xl font-bold"
                size="lg"
              >
                <Crown className="h-6 w-6 mr-2" fill="currentColor" />
                {t("profile.goPremium")}
              </Button>
            </div>
          </Card>
        )}

        {/* Premium Badge for Premium Users */}
        {profile.is_premium && (
          <Card className="bg-background border-2 border-primary/30">
            <div className="p-6 text-center">
              <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none text-lg px-6 py-2">
                <Crown className="h-5 w-5 mr-2" fill="currentColor" />
                {t("profile.premiumMember")}
              </Badge>
              <p className="text-sm text-muted-foreground mt-3">
                {t("profile.premiumEnjoy")}
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Preview Dialog - Shows your card exactly as others see it */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {profile.full_name}, {profile.age}
            </DialogTitle>
            <div className="flex flex-wrap gap-2">
              {profile.verified && (
                <Badge className="bg-primary text-white border-none">{t("common.verified")}</Badge>
              )}
              {profile.is_premium && (
                <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
                  {t("common.premium")}
                </Badge>
              )}
              {profile.video_intro_url && (
                <Badge className="bg-background/80 text-white border-none">{t("common.videoIntroLabel")}</Badge>
              )}
              {profile.mood_emoji && (
                <Badge
                  className="bg-primary/80 text-white border-none backdrop-blur-sm"
                  title={profile.mood_text || undefined}
                >
                  {profile.mood_emoji} {profile.mood_text ? profile.mood_text.slice(0, 15) : ""}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Image Carousel */}
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
              {profile.profile_image_url ? (
                <>
                  <img
                    src={
                      profile.profile_images && profile.profile_images.length > 0
                        ? profile.profile_images[previewImageIndex] || profile.profile_image_url
                        : profile.profile_image_url
                    }
                    alt={`${profile.full_name} - Photo ${previewImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {profile.profile_images && profile.profile_images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                        onClick={() =>
                          setPreviewImageIndex((prev) =>
                            prev === 0 ? profile.profile_images!.length - 1 : prev - 1
                          )
                        }
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                        onClick={() =>
                          setPreviewImageIndex((prev) =>
                            prev === profile.profile_images!.length - 1 ? 0 : prev + 1
                          )
                        }
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {profile.profile_images.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full ${
                              idx === previewImageIndex ? "bg-card" : "bg-card/50"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {t("common.noPhoto")}
                </div>
              )}
            </div>

            {/* Video Intro */}
            {profile.video_intro_url && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{t("common.videoIntro")}</h4>
                <div className="rounded-lg overflow-hidden border border-primary/20">
                  <video
                    src={profile.video_intro_url}
                    controls
                    className="w-full max-h-[420px] object-cover"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            {profile.city && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {profile.city}
                  {profile.country ? `, ${profile.country}` : ""}
                </span>
              </div>
            )}

            {/* Profile Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {profile.work && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                  <p className="font-semibold text-sm text-foreground">{profile.work}</p>
                </Card>
              )}
              {profile.education && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                  <p className="font-semibold text-sm text-foreground">{profile.education}</p>
                </Card>
              )}
              {(profile.height_cm || profile.height) && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                  <p className="font-semibold text-sm text-foreground">
                    {profile.height_cm ? `${profile.height_cm} cm` : profile.height}
                  </p>
                </Card>
              )}
              {profile.zodiac_sign && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                  <p className="font-semibold text-sm text-foreground">{profile.zodiac_sign}</p>
                </Card>
              )}
              {profile.religion && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                  <p className="font-semibold text-sm text-foreground">{profile.religion}</p>
                </Card>
              )}
              {profile.lifestyle && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                  <p className="font-semibold text-sm text-foreground">{profile.lifestyle}</p>
                </Card>
              )}
              {profile.drinking && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                  <p className="font-semibold text-sm text-foreground">{profile.drinking}</p>
                </Card>
              )}
              {profile.smoking && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                  <p className="font-semibold text-sm text-foreground">{profile.smoking}</p>
                </Card>
              )}
              {profile.pets && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                  <p className="font-semibold text-sm text-foreground">{profile.pets}</p>
                </Card>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">💬</span> About
                </h3>
                <p className="text-foreground leading-relaxed bg-background p-4 rounded-lg">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Looking For */}
            {(profile.looking_for || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">💕</span> Looking For
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.looking_for || []).map((item, idx) => (
                    <Badge
                      key={idx}
                      className="text-sm py-1.5 px-4 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 border-none"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Interests */}
            {(profile.interests || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">✨</span> Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.interests || []).map((interest, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-sm py-1.5 px-4 rounded-full bg-primary/10 text-primary border-border"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Soundtrack player */}
            {profile.soundtrack_url &&
              profile.soundtrack_source &&
              (() => {
                const ytId =
                  profile.soundtrack_source === "youtube"
                    ? extractYouTubeId(profile.soundtrack_url!)
                    : null;
                const spId =
                  profile.soundtrack_source === "spotify"
                    ? extractSpotifyTrackId(profile.soundtrack_url!)
                    : null;
                if (!ytId && !spId) return null;
                return (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">🎵</span> Soundtrack
                    </h3>
                    {(profile.soundtrack_title || profile.soundtrack_artist) && (
                      <p className="text-sm text-muted-foreground">
                        {profile.soundtrack_title}
                        {profile.soundtrack_artist ? ` — ${profile.soundtrack_artist}` : ""}
                      </p>
                    )}
                    {ytId && (
                      <div className="rounded-xl overflow-hidden aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title="Profile soundtrack"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {spId && (
                      <div className="rounded-xl overflow-hidden">
                        <iframe
                          src={`https://open.spotify.com/embed/track/${spId}?theme=0`}
                          title="Profile soundtrack"
                          className="w-full"
                          height="152"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog open={showStoryViewer} onOpenChange={setShowStoryViewer}>
        <DialogContent
          className="max-w-md p-0 overflow-hidden bg-black border-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{t("common.storyViewer")}</DialogTitle>
          {myStories[storyViewerIndex] && (
            <div className="relative">
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
                {myStories.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i <= storyViewerIndex ? "bg-white w-full" : "w-0"}`}
                    />
                  </div>
                ))}
              </div>
              {/* Name + time */}
              <div className="absolute top-5 left-3 z-10 flex items-center gap-2">
                <img
                  src={profile?.profile_image_url || "/placeholder.svg"}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover border-2 border-white"
                />
                <div>
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatTimeAgo(myStories[storyViewerIndex].created_at, t)}
                  </p>
                </div>
              </div>
              {/* Media */}
              {myStories[storyViewerIndex].media_type === "video" ? (
                <video
                  src={myStories[storyViewerIndex].media_url}
                  autoPlay
                  playsInline
                  className="w-full aspect-[9/16] object-cover"
                  onEnded={() => {
                    if (storyViewerIndex < myStories.length - 1)
                      setStoryViewerIndex(storyViewerIndex + 1);
                    else setShowStoryViewer(false);
                  }}
                />
              ) : (
                <img
                  src={myStories[storyViewerIndex].media_url}
                  alt="Story"
                  className="w-full aspect-[9/16] object-cover"
                />
              )}
              {/* Caption */}
              {myStories[storyViewerIndex].caption && (
                <div className="absolute bottom-16 left-0 right-0 px-4 text-center">
                  <p className="text-white text-sm font-medium drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 inline-block">
                    {myStories[storyViewerIndex].caption}
                  </p>
                </div>
              )}
              {/* Tap zones */}
              <div className="absolute inset-0 flex">
                <button
                  className="w-1/2 h-full"
                  onClick={() => {
                    if (storyViewerIndex > 0) setStoryViewerIndex(storyViewerIndex - 1);
                  }}
                  aria-label={t("profile.previousStory")}
                />
                <button
                  className="w-1/2 h-full"
                  onClick={() => {
                    if (storyViewerIndex < myStories.length - 1)
                      setStoryViewerIndex(storyViewerIndex + 1);
                    else setShowStoryViewer(false);
                  }}
                  aria-label={t("profile.nextStory")}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default MyProfile;
