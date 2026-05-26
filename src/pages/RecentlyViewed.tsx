import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ArrowLeft, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ViewedProfile {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  city?: string | null;
  country?: string | null;
  viewed_at?: string;
}

const RecentlyViewed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ViewedProfile[]>([]);

  const fetchViewed = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profile_views")
      .select(
        "viewed_at, profiles!profile_views_viewed_id_fkey (id, full_name, age, profile_image_url, city, country)"
      )
      .eq("viewer_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(100);

    if (error) {
      logger.error("Failed to load recently viewed", error);
      toast.error(t("recentlyViewed.failedLoad"));
      return;
    }

    const mapped = (data || [])
      .filter((item) => item.profiles)
      .map((item) => ({
        ...(item.profiles as ViewedProfile),
        viewed_at: item.viewed_at,
      }));

    setProfiles(mapped);
  }, [user, t]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    fetchViewed().finally(() => setLoading(false));
  }, [user, navigate, fetchViewed]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Eye className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("recentlyViewed.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("recentlyViewed.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 rounded-2xl border-2 border-border animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-2 border-border">
            <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">{t("recentlyViewed.noRecentlyViewed")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("recentlyViewed.browseProfiles")}
            </p>
            <Button className="mt-5 rounded-full" onClick={() => navigate("/discover")}>
              {t("recentlyViewed.goToDiscover")}
            </Button>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3 px-1">
              {profiles.length} profile{profiles.length !== 1 ? "s" : ""} viewed
            </p>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card
                  key={`${profile.id}-${profile.viewed_at}`}
                  className="p-4 rounded-2xl border-2 border-border"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={profile.profile_image_url || "/placeholder.svg"}
                      alt={profile.full_name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {profile.full_name}, {profile.age}
                      </p>
                      {(profile.city || profile.country) && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {[profile.city, profile.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      {profile.viewed_at && (
                        <Badge variant="secondary" className="mt-2 text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(profile.viewed_at)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default RecentlyViewed;
