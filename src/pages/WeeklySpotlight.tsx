import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Star, Heart, Crown, MapPin, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface SpotlightProfile {
  id: string;
  full_name: string;
  profile_image_url: string | null;
  bio: string | null;
  age: number;
  city: string | null;
  interests: string[];
  verified: boolean | null;
}

const WeeklySpotlight = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [spotlight, setSpotlight] = useState<SpotlightProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousSpotlights, setPreviousSpotlights] = useState<SpotlightProfile[]>([]);
  const [weekStats, setWeekStats] = useState<{ matches: number; likes: number } | null>(null);

  const loadSpotlight = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Calculate start of the current week (Monday)
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(now);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartISO = weekStart.toISOString();

      // Load this week's stats in parallel with spotlight
      const [matchData, likesData] = await Promise.all([
        supabase
          .from("matches")
          .select("user1_id, user2_id")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .gte("created_at", weekStartISO),
        supabase
          .from("likes")
          .select("id", { count: "exact", head: true })
          .eq("liked_id", user.id)
          .gte("created_at", weekStartISO),
      ]);

      const matchedIds = new Set(
        (matchData.data || []).map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id))
      );

      setWeekStats({
        matches: matchData.data?.length ?? 0,
        likes: likesData.count ?? 0,
      });

      // Get a "random" featured profile (simulate weekly spotlight)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url, bio, age, city, interests, verified")
        .neq("id", user.id)
        .limit(10);

      if (profiles && profiles.length > 0) {
        // Filter out matched users
        const availableProfiles = profiles.filter(
          (p) => !matchedIds.has(p.id)
        ) as SpotlightProfile[];

        if (availableProfiles.length > 0) {
          // Use week number + user-specific seed so each user sees a different spotlight
          const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
          const userSeed = parseInt(user.id.replace(/-/g, "").slice(0, 8), 16) || 0;
          const index = (weekNumber + userSeed) % availableProfiles.length;
          const featured = availableProfiles[index];
          setSpotlight(featured);

          // Others become "previous spotlights"
          const others = availableProfiles.filter((_, i) => i !== index).slice(0, 4);
          setPreviousSpotlights(others);
        } else {
          setSpotlight(null);
          setPreviousSpotlights([]);
        }
      }
    } catch (e) {
      logger.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSpotlight();
  }, [loadSpotlight]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Star className="h-5 w-5 text-amber-500" />
        <h1 className="text-lg font-bold">{t("weeklySpotlight.title")}</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Your stats this week */}
        {weekStats && (
          <Card className="p-4 rounded-2xl border border-border bg-card/80">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {t("weeklySpotlight.yourStatsThisWeek", "Your stats this week")}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{weekStats.matches}</div>
                <div className="text-xs text-muted-foreground">
                  {t("weeklySpotlight.newMatches", "New matches")}
                </div>
              </div>
              <div className="bg-primary/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{weekStats.likes}</div>
                <div className="text-xs text-muted-foreground">
                  {t("weeklySpotlight.likesReceived", "Likes received")}
                </div>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            {t("weeklySpotlight.loading")}
          </div>
        ) : spotlight ? (
          <>
            <Card className="overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] border-0 rounded-3xl">
              <div className="relative aspect-[3/4] bg-gradient-to-br from-background via-muted to-primary/20">
                <img
                  src={spotlight.profile_image_url || "/placeholder.svg"}
                  alt={spotlight.full_name}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Spotlight badge */}
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-sm text-white text-xs font-semibold">
                    <Crown className="h-3 w-3" /> {t("weeklySpotlight.thisWeeksSpotlight")}
                  </span>
                </div>

                {/* Boost icon */}
                <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-full p-1.5">
                  <Zap className="h-4 w-4 text-amber-400 animate-pulse" fill="currentColor" />
                </div>

                {/* Info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                      {spotlight.full_name}
                    </h3>
                    <span className="text-2xl font-light opacity-90">{spotlight.age}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {spotlight.verified && (
                      <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                        ? {t("weeklySpotlight.verified")}
                      </Badge>
                    )}
                  </div>
                  {spotlight.city && (
                    <div className="flex items-center gap-3 text-sm font-medium mb-3">
                      <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                        <MapPin className="h-4 w-4" />
                        <span>{spotlight.city}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 bg-card/95 backdrop-blur-md space-y-4">
                {spotlight.bio && (
                  <p className="text-foreground text-sm leading-relaxed line-clamp-3">
                    {spotlight.bio}
                  </p>
                )}
                {spotlight.interests && spotlight.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {spotlight.interests.slice(0, 5).map((i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="rounded-full px-3 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                      >
                        {i}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full rounded-2xl bg-gradient-to-r from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] hover:brightness-110 text-white border-0 shadow-[0_4px_16px_hsl(350,65%,60%,0.35)] transition-all duration-200"
                  onClick={() => navigate("/discover")}
                >
                  <Heart className="h-5 w-5 mr-2 fill-current" />
                  {t("weeklySpotlight.viewOnDiscover")}
                </Button>
              </div>
            </Card>

            {previousSpotlights.length > 0 && (
              <>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />{" "}
                  {t("weeklySpotlight.previousSpotlights")}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {previousSpotlights.map((p) => (
                    <Card
                      key={p.id}
                      className="overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] border-0 rounded-3xl"
                    >
                      <div className="relative aspect-[3/4] bg-gradient-to-br from-background via-muted to-primary/20">
                        <img
                          src={p.profile_image_url || "/placeholder.svg"}
                          alt={p.full_name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="text-base font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] truncate">
                              {p.full_name}
                            </h3>
                            <span className="text-sm font-light opacity-90 flex-shrink-0">
                              {p.age}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mb-1">
                            {p.verified && (
                              <Badge className="bg-primary text-white border-none text-[9px] px-1 py-0 h-3.5">
                                ? {t("weeklySpotlight.verified")}
                              </Badge>
                            )}
                          </div>
                          {p.city && (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-2 py-0.5 rounded-full text-xs w-fit">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{p.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Star className="h-16 w-16 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">{t("weeklySpotlight.noSpotlight")}</h3>
            <p className="text-muted-foreground">{t("weeklySpotlight.checkBackSoon")}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default WeeklySpotlight;
