import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Eye, Heart, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface ProfileItem {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  city?: string | null;
  country?: string | null;
  timestamp?: string;
}

const NotificationsCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState<"views" | "likes">("views");
  const [views, setViews] = useState<ProfileItem[]>([]);
  const [likes, setLikes] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchViews = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profile_views")
      .select(
        `viewer_id, viewed_at, profiles!profile_views_viewer_id_fkey (id, full_name, age, profile_image_url, city, country)`
      )
      .eq("viewed_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(50);

    const mapped = (data || [])
      .filter((v) => v.profiles)
      .map((v) => ({
        ...(v.profiles as unknown as ProfileItem),
        timestamp: v.viewed_at,
      }));

    setViews(mapped);
  }, [user]);

  const fetchLikes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("likes")
      .select(
        `liker_id, created_at, profiles!likes_liker_id_fkey (id, full_name, age, profile_image_url, city, country)`
      )
      .eq("liked_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const mapped = (data || [])
      .filter((l) => l.profiles)
      .map((l) => ({
        ...(l.profiles as unknown as ProfileItem),
        timestamp: l.created_at,
      }));

    setLikes(mapped);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    Promise.allSettled([fetchViews(), fetchLikes()]).finally(() => setLoading(false));
  }, [user, navigate, fetchViews, fetchLikes]);

  const items = tab === "views" ? views : likes;

  const handleTestPush = async () => {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-push", {
        body: {
          user_id: user.id,
          title: "Shqiponja",
          body: "Test push delivered successfully.",
          url: "/notifications",
        },
      });

      if (error) throw error;
      toast.success(t("notificationsCenter.pushSent"));
    } catch (error) {
      logger.error("Push send error", error);
      toast.error(t("notificationsCenter.failedPush"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bell className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t("notificationsCenter.title")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("notificationsCenter.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              {t("common.back")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant="outline"
            className={`rounded-2xl border-2 ${tab === "views" ? "border-primary text-primary" : "border-primary/20"}`}
            onClick={() => setTab("views")}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t("notificationsCenter.viewsTab")}
          </Button>
          <Button
            variant="outline"
            className={`rounded-2xl border-2 ${tab === "likes" ? "border-primary text-primary" : "border-primary/20"}`}
            onClick={() => setTab("likes")}
          >
            <Heart className="h-4 w-4 mr-2" />
            {t("notificationsCenter.likesTab")}
          </Button>
        </div>

        <Card className="p-4 mb-6 rounded-2xl border-2 border-border bg-card/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                {t("notificationsCenter.pushNotifications")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("notificationsCenter.sendTestDesc")}
              </p>
            </div>
            <Button size="sm" onClick={handleTestPush} disabled={sending}>
              {sending ? t("notificationsCenter.sending") : t("notificationsCenter.sendTest")}
            </Button>
          </div>
        </Card>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">
            {t("common.loading")}
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background">
            <p className="text-muted-foreground">{t("notificationsCenter.noNotifications")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <Card
                key={item.id + (item.timestamp || "")}
                className="overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] border-0 rounded-3xl cursor-pointer hover:shadow-[0_25px_70px_rgba(0,0,0,0.3)] transition-all duration-300"
                onClick={() => navigate(tab === "likes" ? "/who-liked-you" : "/discover")}
              >
                <div className="relative aspect-[3/4] bg-gradient-to-br from-background via-muted to-primary/20">
                  <img
                    src={item.profile_image_url || "/placeholder.svg"}
                    alt={item.full_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  {/* Viewed/Liked badge */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      className={`text-white border-none text-[10px] px-1.5 py-0 h-4 ${
                        tab === "likes"
                          ? "bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)]"
                          : "bg-blue-500/90 backdrop-blur-sm"
                      }`}
                    >
                      {tab === "views"
                        ? t("notificationsCenter.viewedYou")
                        : t("notificationsCenter.likedYou")}
                    </Badge>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] truncate">
                        {item.full_name}
                      </h3>
                      <span className="text-lg font-light opacity-90 flex-shrink-0">
                        {item.age}
                      </span>
                    </div>
                    {(item.city || item.country) && (
                      <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-2.5 py-0.5 rounded-full text-xs w-fit">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {[item.city, item.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsCenter;
