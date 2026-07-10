import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Eye, Heart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface ViewerProfile {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  video_intro_url?: string | null;
  city?: string | null;
  country?: string | null;
  viewed_at?: string;
}

const ProfileInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [views7d, setViews7d] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [recentViewers, setRecentViewers] = useState<ViewerProfile[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<ViewerProfile[]>([]);

  const sinceDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }, []);

  const loadInsights = useCallback(async () => {
    if (!user) return;
    try {
      const [viewsAll, viewsRecent, likesAll, matchesAll, viewers, viewed] = await Promise.all([
        supabase
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("viewed_id", user.id),
        supabase
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("viewed_id", user.id)
          .gte("viewed_at", sinceDate),
        supabase.from("likes").select("id", { count: "exact", head: true }).eq("liked_id", user.id),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase
          .from("profile_views")
          .select(
            "viewed_at, profiles!profile_views_viewer_id_fkey (id, full_name, age, profile_image_url, video_intro_url, city, country)"
          )
          .eq("viewed_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(8),
        supabase
          .from("profile_views")
          .select(
            "viewed_at, profiles!profile_views_viewed_id_fkey (id, full_name, age, profile_image_url, video_intro_url, city, country)"
          )
          .eq("viewer_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(8),
      ]);

      if (
        viewsAll.error ||
        viewsRecent.error ||
        likesAll.error ||
        matchesAll.error ||
        viewers.error ||
        viewed.error
      ) {
        throw (
          viewsAll.error ||
          viewsRecent.error ||
          likesAll.error ||
          matchesAll.error ||
          viewers.error ||
          viewed.error
        );
      }

      setTotalViews(viewsAll.count || 0);
      setViews7d(viewsRecent.count || 0);
      setTotalLikes(likesAll.count || 0);
      setTotalMatches(matchesAll.count || 0);

      const mapped = (viewers.data || [])
        .filter((item) => item.profiles)
        .map((item) => ({
          ...(item.profiles as ViewerProfile),
          viewed_at: item.viewed_at,
        }));
      setRecentViewers(mapped);

      const mappedViewed = (viewed.data || [])
        .filter((item) => item.profiles)
        .map((item) => ({
          ...(item.profiles as ViewerProfile),
          viewed_at: item.viewed_at,
        }));
      setRecentlyViewed(mappedViewed);
    } catch (error) {
      logger.error("Failed to load insights", error);
      toast.error(t("profileInsights.failedLoad"));
    }
  }, [user, sinceDate, t]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    loadInsights().finally(() => setLoading(false));
  }, [user, navigate, loadInsights]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Activity className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("profileInsights.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("profileInsights.subtitle")}</p>
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

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">
            {t("common.loading")}
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {t("profileInsights.totalViews")}
                </div>
                <div className="text-3xl font-bold mt-2 text-foreground">{totalViews}</div>
              </Card>
              <Card className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {t("profileInsights.viewsSevenDays")}
                </div>
                <div className="text-3xl font-bold mt-2 text-foreground">{views7d}</div>
              </Card>
              <Card className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  {t("profileInsights.likes")}
                </div>
                <div className="text-3xl font-bold mt-2 text-foreground">{totalLikes}</div>
              </Card>
              <Card className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t("profileInsights.matches")}
                </div>
                <div className="text-3xl font-bold mt-2 text-foreground">{totalMatches}</div>
              </Card>
            </div>

            <Card className="mt-6 p-4 rounded-2xl border-2 border-border">
              <h2 className="text-lg font-semibold mb-3">{t("profileInsights.recentlyViewed")}</h2>
              {recentlyViewed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("profileInsights.noProfilesViewed")}
                </p>
              ) : (
                <div className="space-y-3">
                  {recentlyViewed.map((profile) => (
                    <div
                      key={`${profile.id}-${profile.viewed_at}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative">
                        <img
                          src={profile.profile_image_url || "/placeholder.svg"}
                          alt={profile.full_name}
                          className="h-12 w-12 rounded-full object-cover border-2 border-border"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {profile.full_name}, {profile.age}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[profile.city, profile.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="mt-6 p-4 rounded-2xl border-2 border-border">
              <h2 className="text-lg font-semibold mb-3">{t("profileInsights.recentViewers")}</h2>
              {recentViewers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("profileInsights.noRecentViewers")}
                </p>
              ) : (
                <div className="space-y-3">
                  {recentViewers.map((viewer) => (
                    <div
                      key={`${viewer.id}-${viewer.viewed_at}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative">
                        <img
                          src={viewer.profile_image_url || "/placeholder.svg"}
                          alt={viewer.full_name}
                          className="h-12 w-12 rounded-full object-cover border-2 border-border"
                        />
                        {viewer.video_intro_url && (
                          <span className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                            {t("common.video")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {viewer.full_name}, {viewer.age}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[viewer.city, viewer.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfileInsights;
