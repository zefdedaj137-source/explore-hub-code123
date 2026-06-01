import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Heart, X, MapPin, Briefcase, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface PassedProfile {
  id: string;
  full_name: string;
  age: number;
  bio: string | null;
  city: string | null;
  work: string | null;
  profile_image_url: string | null;
  profile_images: string[] | null;
  interests: string[] | null;
  verified: boolean | null;
  passedAt: string;
}

const SecondLook = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [passedProfiles, setPassedProfiles] = useState<PassedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<PassedProfile | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const storageKey = `passed_profiles_${user?.id}`;

  const loadPassed = useCallback(async () => {
    if (!user) return;

    try {
      // Load passed profile IDs from localStorage
      const stored = localStorage.getItem(storageKey);
      const passedData: { id: string; passedAt: string }[] = stored ? JSON.parse(stored) : [];

      if (passedData.length === 0) {
        setPassedProfiles([]);
        setLoading(false);
        return;
      }

      // Fetch profile details from Supabase
      const ids = passedData.map((p) => p.id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select(
          "id, full_name, age, bio, city, work, profile_image_url, profile_images, interests, verified"
        )
        .in("id", ids);

      if (profiles) {
        const passedMap = new Map(passedData.map((p) => [p.id, p.passedAt]));
        const merged = profiles
          .map((p) => ({
            ...p,
            passedAt: passedMap.get(p.id) || new Date().toISOString(),
          }))
          .sort((a, b) => new Date(b.passedAt).getTime() - new Date(a.passedAt).getTime());
        setPassedProfiles(merged);
      }
    } catch (error) {
      logger.error("Error loading passed profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [user, storageKey]);

  useEffect(() => {
    loadPassed();
  }, [loadPassed]);

  // Also track passes from Discover page
  useEffect(() => {
    if (!user) return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        loadPassed();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user, storageKey, loadPassed]);

  const handleLike = async (profile: PassedProfile) => {
    if (!user) return;

    try {
      const { data, error } = (await supabase.rpc("like_user", {
        current_user_id: user.id,
        target_user_id: profile.id,
      })) as {
        data: { success: boolean; is_match: boolean; error?: string } | null;
        error: unknown;
      };

      if (error) throw error;

      if (data && !data.success) {
        toast.info(data.error || "Out of swipes!");
        return;
      }

      setLikedIds((prev) => new Set([...prev, profile.id]));

      // Remove from passed list
      const stored = localStorage.getItem(storageKey);
      const passedData: { id: string; passedAt: string }[] = stored ? JSON.parse(stored) : [];
      const updated = passedData.filter((p) => p.id !== profile.id);
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (data?.is_match) {
        toast.success(`?? It's a match with ${profile.full_name}!`);
      } else {
        toast.success(`?? Liked ${profile.full_name}`);
      }

      // Remove from local list
      setPassedProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      setSelectedProfile(null);
    } catch (error) {
      logger.error("Error liking profile:", error);
      toast.error(t("secondLook.failedLike"));
    }
  };

  const handleDismiss = (profileId: string) => {
    // Permanently dismiss � remove from passed list
    const stored = localStorage.getItem(storageKey);
    const passedData: { id: string; passedAt: string }[] = stored ? JSON.parse(stored) : [];
    const updated = passedData.filter((p) => p.id !== profileId);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setPassedProfiles((prev) => prev.filter((p) => p.id !== profileId));
    setSelectedProfile(null);
    toast("Profile removed from Second Look");
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/10 via-primary/10 to-primary/10 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Eye className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold">{t("secondLook.title")}</h1>
            <p className="text-xs text-muted-foreground">
              {passedProfiles.length} {t("secondLook.passedProfiles")}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Info card */}
        <Card className="p-4 bg-gradient-to-r from-primary to-primary text-white border-0">
          <div className="flex items-center gap-3">
            <div className="bg-card/20 rounded-full p-2">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">{t("secondLook.changedYourMind")}</h2>
              <p className="text-sm text-primary/20">{t("secondLook.browseDesc")}</p>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-3 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-muted rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-28" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : passedProfiles.length === 0 ? (
          <Card className="p-8 text-center">
            <Eye className="h-12 w-12 mx-auto text-primary/80 mb-3" />
            <h3 className="font-bold text-lg">{t("secondLook.noPassedProfiles")}</h3>
            <p className="text-muted-foreground text-sm mt-1">{t("secondLook.whenYouPass")}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/discover")}>
              <Sparkles className="h-4 w-4 mr-2" /> {t("secondLook.goToDiscover")}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {passedProfiles.map((profile) => (
              <Card
                key={profile.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedProfile(profile)}
              >
                <div className="relative h-48">
                  <img
                    src={profile.profile_image_url || "/placeholder.svg"}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <h3 className="font-bold text-sm truncate">
                      {profile.full_name}, {profile.age}
                    </h3>
                    {profile.city && (
                      <p className="text-[11px] opacity-80 flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {profile.city}
                      </p>
                    )}
                  </div>
                  {profile.verified && (
                    <Badge className="absolute top-2 right-2 bg-primary text-[10px] px-1.5 py-0">
                      ?
                    </Badge>
                  )}
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {t("secondLook.passed")} {timeAgo(profile.passedAt)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(profile.id);
                      }}
                      className="p-1 rounded-full hover:bg-muted"
                      aria-label={t("secondLook.dismiss")}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(profile);
                      }}
                      className="p-1 rounded-full hover:bg-pink-50"
                      aria-label={t("secondLook.like")}
                    >
                      <Heart className="h-3.5 w-3.5 text-pink-500" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Profile detail modal */}
      {selectedProfile && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="bg-card rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-72">
              <img
                src={selectedProfile.profile_image_url || "/placeholder.svg"}
                alt={selectedProfile.full_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h2 className="text-2xl font-bold">
                  {selectedProfile.full_name}, {selectedProfile.age}
                </h2>
                {selectedProfile.city && (
                  <p className="text-sm opacity-90 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {selectedProfile.city}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {selectedProfile.bio && <p className="text-foreground">{selectedProfile.bio}</p>}

              {selectedProfile.work && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" /> {selectedProfile.work}
                </p>
              )}

              {selectedProfile.interests && selectedProfile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.interests.map((i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {i}
                    </Badge>
                  ))}
                </div>
              )}

              {selectedProfile.profile_images && selectedProfile.profile_images.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedProfile.profile_images.slice(0, 6).map((img, i) => (
                    <img
                      key={img}
                      src={img}
                      alt={`Photo ${i + 1} of ${selectedProfile.full_name}`}
                      loading="lazy"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2 pb-4">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleDismiss(selectedProfile.id)}
                >
                  <X className="h-4 w-4" /> {t("secondLook.passAgain")}
                </Button>
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                  onClick={() => handleLike(selectedProfile)}
                >
                  <Heart className="h-4 w-4" /> {t("secondLook.like")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SecondLook;
