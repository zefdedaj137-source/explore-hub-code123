import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Heart,
  X,
  Star,
  RefreshCw,
  MapPin,
  Briefcase,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";
import { translateInterest } from "@/utils/translateInterest";

interface PickProfile {
  id: string;
  full_name: string;
  age: number;
  bio: string | null;
  city: string | null;
  country: string | null;
  profile_image_url: string | null;
  profile_images: string[] | null;
  interests: string[] | null;
  work: string | null;
  education: string | null;
  verified: boolean | null;
  is_premium: boolean | null;
  zodiac_sign: string | null;
  compatibility: number;
  matchReasons: string[];
}

const ZODIAC_COMPATIBILITY: Record<string, string[]> = {
  aries: ["leo", "sagittarius", "gemini", "aquarius"],
  taurus: ["virgo", "capricorn", "cancer", "pisces"],
  gemini: ["libra", "aquarius", "aries", "leo"],
  cancer: ["scorpio", "pisces", "taurus", "virgo"],
  leo: ["aries", "sagittarius", "gemini", "libra"],
  virgo: ["taurus", "capricorn", "cancer", "scorpio"],
  libra: ["gemini", "aquarius", "leo", "sagittarius"],
  scorpio: ["cancer", "pisces", "virgo", "capricorn"],
  sagittarius: ["aries", "leo", "libra", "aquarius"],
  capricorn: ["taurus", "virgo", "scorpio", "pisces"],
  aquarius: ["gemini", "libra", "aries", "sagittarius"],
  pisces: ["cancer", "scorpio", "taurus", "capricorn"],
};

const AIMatchmaker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [topPicks, setTopPicks] = useState<PickProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myProfile, setMyProfile] = useState<{
    interests: string[] | null;
    city: string | null;
    zodiac_sign: string | null;
    age: number | null;
    education: string | null;
    looking_for: string[] | null;
    gender: string | null;
    gender_preference: string | null;
  } | null>(null);
  const [likedPicks, setLikedPicks] = useState<Set<string>>(new Set());
  const [dismissedPicks, setDismissedPicks] = useState<Set<string>>(new Set());
  const [selectedPick, setSelectedPick] = useState<PickProfile | null>(null);

  const calculateCompatibility = useCallback(
    (profile: Record<string, unknown>): { score: number; reasons: string[] } => {
      if (!myProfile) return { score: 50, reasons: ["New match"] };

      let score = 40; // base score
      const reasons: string[] = [];

      // Shared interests (up to +25)
      const myInterests = myProfile.interests || [];
      const theirInterests = (profile.interests as string[]) || [];
      const shared = myInterests.filter((i) => theirInterests.includes(i));
      if (shared.length > 0) {
        score += Math.min(25, shared.length * 5);
        reasons.push(
          `${shared.length} shared interest${shared.length > 1 ? "s" : ""}: ${shared.slice(0, 3).join(", ")}`
        );
      }

      // Same city (+10)
      if (
        myProfile.city &&
        profile.city &&
        (myProfile.city as string).toLowerCase() === (profile.city as string).toLowerCase()
      ) {
        score += 10;
        reasons.push("Same city");
      }

      // Zodiac compatibility (+8)
      const myZodiac = myProfile.zodiac_sign?.toLowerCase();
      const theirZodiac = (profile.zodiac_sign as string)?.toLowerCase();
      if (myZodiac && theirZodiac && ZODIAC_COMPATIBILITY[myZodiac]?.includes(theirZodiac)) {
        score += 8;
        reasons.push("Compatible zodiac signs ✨");
      }

      // Age proximity (+7)
      const myAge = myProfile.age || 25;
      const theirAge = (profile.age as number) || 25;
      const ageDiff = Math.abs(myAge - theirAge);
      if (ageDiff <= 3) {
        score += 7;
        reasons.push("Similar age");
      } else if (ageDiff <= 6) {
        score += 4;
      }

      // Both have education (+5)
      if (myProfile.education && profile.education) {
        score += 5;
        reasons.push("Both educated");
      }

      // Verified (+5)
      if (profile.verified) {
        score += 5;
        reasons.push("Verified profile ✓");
      }

      // Has bio (+3)
      if (profile.bio) {
        score += 3;
        reasons.push("Detailed profile");
      }

      // Has multiple photos (+2)
      if ((profile.profile_images as string[])?.length >= 3) {
        score += 2;
      }

      // Cap at 99
      score = Math.min(99, score);

      if (reasons.length === 0) {
        reasons.push("Potential match");
      }

      return { score, reasons };
    },
    [myProfile]
  );

  const fetchTopPicks = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch my profile first
      const { data: me } = await supabase
        .from("profiles")
        .select(
          "interests, city, zodiac_sign, age, education, looking_for, gender, gender_preference"
        )
        .eq("id", user.id)
        .single();

      if (me) setMyProfile(me);

      // Get profiles I've already liked or passed
      const { data: existingLikes } = await supabase
        .from("likes")
        .select("liked_id")
        .eq("liker_id", user.id);

      // Also exclude already-matched profiles
      const { data: matchData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const matchedIds = (matchData || []).map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      const excludeIds = new Set([...(existingLikes || []).map((l) => l.liked_id), ...matchedIds]);
      excludeIds.add(user.id);

      // Fetch candidate profiles
      const { data: candidates } = await supabase
        .from("profiles")
        .select(
          "id, full_name, age, bio, city, country, profile_image_url, profile_images, interests, work, education, verified, is_premium, zodiac_sign, gender, gender_preference"
        )
        .neq("id", user.id)
        .not("full_name", "is", null)
        .limit(100);

      if (!candidates) {
        setTopPicks([]);
        return;
      }

      // Gender preference filter
      const myGenderPref = (me?.gender_preference || "everyone").toLowerCase();
      const myGender = (me?.gender || "").toLowerCase();

      // Filter out already-liked and calculate compatibility
      const scored = candidates
        .filter((c) => !excludeIds.has(c.id))
        .filter((c) => {
          const theirGender = (
            ((c as Record<string, unknown>).gender as string) || ""
          ).toLowerCase();
          const theirGenderPref = (
            ((c as Record<string, unknown>).gender_preference as string) || "everyone"
          ).toLowerCase();
          // I must want their gender
          if (myGenderPref !== "everyone" && theirGender !== myGenderPref) return false;
          // They must want my gender
          if (theirGenderPref !== "everyone" && myGender !== theirGenderPref) return false;
          return true;
        })
        .map((c) => {
          const { score, reasons } = calculateCompatibility(c as Record<string, unknown>);
          return {
            ...c,
            compatibility: score,
            matchReasons: reasons,
          } as PickProfile;
        })
        .sort((a, b) => b.compatibility - a.compatibility)
        .slice(0, 10);

      setTopPicks(scored);
    } catch (error) {
      logger.error("Error fetching top picks:", error);
      toast.error(t("aiMatchmaker.failedLoad"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, calculateCompatibility, t]);

  useEffect(() => {
    fetchTopPicks();
  }, [fetchTopPicks]);

  const handleRefresh = () => {
    setRefreshing(true);
    setDismissedPicks(new Set());
    fetchTopPicks();
    toast.success(t("aiMatchmaker.refreshing"));
  };

  const handleLikePick = async (pick: PickProfile) => {
    if (!user) return;
    try {
      const { data, error } = (await supabase.rpc("like_user", {
        current_user_id: user.id,
        target_user_id: pick.id,
      })) as { data: { success: boolean; is_match: boolean } | null; error: unknown };

      if (error) throw error;

      setLikedPicks((prev) => new Set([...prev, pick.id]));

      if (data?.is_match) {
        toast.success(t("aiMatchmaker.match", { name: pick.full_name }));
      } else {
        toast.success(t("aiMatchmaker.liked", { name: pick.full_name }));
      }
    } catch (error) {
      logger.error("Error liking pick:", error);
      toast.error(t("aiMatchmaker.failedLike"));
    }
  };

  const handleDismissPick = (pickId: string) => {
    setDismissedPicks((prev) => new Set([...prev, pickId]));
  };

  const visiblePicks = topPicks.filter((p) => !likedPicks.has(p.id) && !dismissedPicks.has(p.id));

  const getCompatibilityColor = (score: number) => {
    if (score >= 85) return "from-green-500 to-emerald-600";
    if (score >= 70) return "from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)]";
    if (score >= 55) return "from-yellow-500 to-orange-500";
    return "from-muted-foreground to-background0";
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 85) return t("aiMatchmaker.excellentMatch");
    if (score >= 70) return t("aiMatchmaker.greatMatch");
    if (score >= 55) return t("aiMatchmaker.goodMatch");
    return t("aiMatchmaker.potentialMatch");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/10 via-primary/10 to-pink-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go back"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-gradient-to-r from-primary to-primary rounded-full p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{t("aiMatchmaker.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("aiMatchmaker.subtitle")}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1"
          >
            {refreshing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("aiMatchmaker.refresh")}
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* AI intro card */}
        <Card className="p-4 bg-gradient-to-r from-primary to-primary text-white border-0">
          <div className="flex items-center gap-3">
            <div className="bg-card/20 rounded-full p-2">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold">{t("aiMatchmaker.todaysPicks")}</h2>
              <p className="text-sm text-primary/20">
                {t("aiMatchmaker.profilesCurated", { count: visiblePicks.length })}
              </p>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-muted rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-32" />
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : visiblePicks.length === 0 ? (
          <Card className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-primary/80 mb-3" />
            <h3 className="font-bold text-lg">{t("aiMatchmaker.caughtUp")}</h3>
            <p className="text-muted-foreground text-sm mt-1">{t("aiMatchmaker.caughtUpDesc")}</p>
            <Button onClick={handleRefresh} className="mt-4 gap-2">
              <RefreshCw className="h-4 w-4" /> {t("aiMatchmaker.generateNew")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {visiblePicks.map((pick, index) => (
              <Card
                key={pick.id}
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedPick(pick)}
              >
                <div className="flex">
                  {/* Photo */}
                  <div className="relative w-28 h-36 flex-shrink-0">
                    <img
                      src={pick.profile_image_url || "/placeholder.svg"}
                      alt={pick.full_name}
                      className="w-full h-full object-cover"
                    />
                    {index < 3 && (
                      <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-white" /> #{index + 1}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base">
                          {pick.full_name}, {pick.age}
                        </h3>
                        {pick.verified && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary px-1.5 py-0"
                          >
                            ✓
                          </Badge>
                        )}
                      </div>
                      {(pick.city || pick.work) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {pick.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" /> {pick.city}
                            </span>
                          )}
                          {pick.work && (
                            <span className="flex items-center gap-0.5">
                              <Briefcase className="h-3 w-3" /> {pick.work}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {pick.matchReasons.slice(0, 2).join(" · ")}
                      </p>
                    </div>

                    {/* Compatibility badge */}
                    <div className="flex items-center justify-between mt-2">
                      <div
                        className={`bg-gradient-to-r ${getCompatibilityColor(pick.compatibility)} text-white text-xs font-bold px-2.5 py-1 rounded-full`}
                      >
                        {t("aiMatchmaker.compatibilityLabel", {
                          score: pick.compatibility,
                          label: getCompatibilityLabel(pick.compatibility),
                        })}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Profile detail modal */}
      {selectedPick && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setSelectedPick(null)}
        >
          <div
            className="bg-card rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hero image */}
            <div className="relative h-72">
              <img
                src={selectedPick.profile_image_url || "/placeholder.svg"}
                alt={selectedPick.full_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h2 className="text-2xl font-bold">
                  {selectedPick.full_name}, {selectedPick.age}
                </h2>
                {selectedPick.city && (
                  <p className="text-sm opacity-90 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {selectedPick.city}
                    {selectedPick.country && `, ${selectedPick.country}`}
                  </p>
                )}
              </div>
              <div
                className={`absolute top-4 right-4 bg-gradient-to-r ${getCompatibilityColor(selectedPick.compatibility)} text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg`}
              >
                {t("aiMatchmaker.matchPercent", { score: selectedPick.compatibility })}
              </div>
            </div>

            {/* Match reasons */}
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                  {t("aiMatchmaker.whyYouMatch")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPick.matchReasons.map((reason, i) => (
                    <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedPick.bio && (
                <div>
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-1">
                    {t("aiMatchmaker.about")}
                  </h3>
                  <p className="text-foreground">{selectedPick.bio}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {selectedPick.work && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" /> {selectedPick.work}
                  </span>
                )}
                {selectedPick.education && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" /> {selectedPick.education}
                  </span>
                )}
                {selectedPick.zodiac_sign && <span>♈ {selectedPick.zodiac_sign}</span>}
              </div>

              {selectedPick.interests && selectedPick.interests.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    {t("aiMatchmaker.interests")}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPick.interests.map((interest) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {translateInterest(interest, t)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {selectedPick.profile_images && selectedPick.profile_images.length > 1 && (
                <div>
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    {t("aiMatchmaker.photos")}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPick.profile_images.slice(0, 6).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-4">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    handleDismissPick(selectedPick.id);
                    setSelectedPick(null);
                  }}
                >
                  <X className="h-4 w-4" /> {t("aiMatchmaker.pass")}
                </Button>
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                  onClick={() => {
                    handleLikePick(selectedPick);
                    setSelectedPick(null);
                  }}
                >
                  <Heart className="h-4 w-4" /> {t("aiMatchmaker.like")}
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

export default AIMatchmaker;
