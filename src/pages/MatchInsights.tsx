import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowLeft, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface MatchRow {
  id: string;
  user1_id: string;
  user2_id: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  profile_image_url: string | null;
  interests?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  looking_for?: string[] | null;
  verified?: boolean | null;
  lifestyle?: string | null;
  work?: string | null;
  education?: string | null;
}

const MatchInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: matchRows, error: matchError } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .limit(100);

      if (matchError) throw matchError;
      const matchList = (matchRows || []) as MatchRow[];
      setMatches(matchList);

      const otherIds = matchList
        .map((match) => (match.user1_id === user.id ? match.user2_id : match.user1_id))
        .filter(Boolean);
      const profileIds = Array.from(new Set([user.id, ...otherIds]));

      if (profileIds.length === 0) {
        setProfiles({});
        setSelectedMatchId("");
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, profile_image_url, interests, latitude, longitude, city, country, bio, looking_for, verified, lifestyle, work, education"
        )
        .in("id", profileIds);

      if (profileError) throw profileError;
      const profileMap: Record<string, ProfileRow> = {};
      (profileRows || []).forEach((profile) => {
        profileMap[profile.id] = profile as ProfileRow;
      });
      setProfiles(profileMap);

      if (matchList.length > 0 && !selectedMatchId) {
        setSelectedMatchId(matchList[0].id);
      }
    } catch (error) {
      logger.error("Failed to load match insights", error);
      toast.error(t("matchInsights.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [user, selectedMatchId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  );

  const myProfile = user ? profiles[user.id] : undefined;
  const otherProfile = useMemo(() => {
    if (!selectedMatch || !user) return undefined;
    const otherId =
      selectedMatch.user1_id === user.id ? selectedMatch.user2_id : selectedMatch.user1_id;
    return profiles[otherId];
  }, [profiles, selectedMatch, user]);

  const sharedInterests = useMemo(() => {
    const myInterests = new Set((myProfile?.interests || []).map((item) => item.toLowerCase()));
    const otherInterests = (otherProfile?.interests || []).map((item) => item.toLowerCase());
    return otherInterests.filter((interest) => myInterests.has(interest));
  }, [myProfile, otherProfile]);

  const distanceLabel = useMemo(() => {
    if (
      !myProfile?.latitude ||
      !myProfile?.longitude ||
      !otherProfile?.latitude ||
      !otherProfile?.longitude
    ) {
      return "Unknown distance";
    }
    const distance = calculateDistance(
      myProfile.latitude,
      myProfile.longitude,
      otherProfile.latitude,
      otherProfile.longitude
    );
    return formatDistance(distance);
  }, [myProfile, otherProfile]);

  const compatibilityScore = useMemo(() => {
    let score = 50;
    score += sharedInterests.length * 8;
    if (otherProfile?.verified) score += 6;
    if (
      otherProfile?.education &&
      myProfile?.education &&
      otherProfile.education === myProfile.education
    )
      score += 4;
    if (
      otherProfile?.lifestyle &&
      myProfile?.lifestyle &&
      otherProfile.lifestyle === myProfile.lifestyle
    )
      score += 4;
    return Math.min(99, score);
  }, [sharedInterests.length, otherProfile, myProfile]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("matchInsights.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("matchInsights.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">{t("common.loading")}</Card>
        ) : matches.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">
            No matches yet.
          </Card>
        ) : (
          <>
            <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
              <h2 className="text-lg font-semibold">{t("matchInsights.chooseMatch")}</h2>
              <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("matchInsights.selectMatchPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((match) => {
                    const otherId = match.user1_id === user?.id ? match.user2_id : match.user1_id;
                    const label = profiles[otherId]?.full_name || "Match";
                    return (
                      <SelectItem key={match.id} value={match.id}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Card>

            {otherProfile && (
              <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={otherProfile.profile_image_url || "/placeholder.svg"}
                    alt={otherProfile.full_name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-border"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {otherProfile.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {[otherProfile.city, otherProfile.country].filter(Boolean).join(", ") ||
                        "Unknown"}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-primary text-white">
                    {compatibilityScore}% match
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="p-4 rounded-2xl border border-primary/20">
                    <p className="text-xs uppercase text-muted-foreground">{t("matchInsights.sharedInterests")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sharedInterests.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {t("matchInsights.noSharedInterests")}
                        </span>
                      ) : (
                        sharedInterests.map((interest) => (
                          <Badge key={interest} variant="secondary">
                            {interest}
                          </Badge>
                        ))
                      )}
                    </div>
                  </Card>
                  <Card className="p-4 rounded-2xl border border-primary/20">
                    <p className="text-xs uppercase text-muted-foreground">{t("matchInsights.distance")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{distanceLabel}</p>
                    <p className="text-xs text-muted-foreground">{t("matchInsights.basedOnLocation")}</p>
                  </Card>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t("matchInsights.suggestedStarters")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Ask about {sharedInterests[0] || "their weekend"}
                    </Badge>
                    <Badge variant="outline">{t("matchInsights.inviteToEvent")}</Badge>
                    <Badge variant="outline">{t("matchInsights.sharePlaylist")}</Badge>
                  </div>
                </div>

                <Card className="p-4 rounded-2xl border border-primary/20 bg-primary/10/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Users className="h-4 w-4" />
                    AI summary
                  </div>
                  <p className="text-sm text-primary mt-2">
                    {compatibilityScore >= 80
                      ? "High compatibility � plan a date or video chat soon."
                      : compatibilityScore >= 65
                        ? "Great potential � focus on shared interests and a light icebreaker."
                        : "New connection � explore interests and values to learn more."}
                  </p>
                </Card>
              </Card>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MatchInsights;
