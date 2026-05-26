import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Heart, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface LikeRow {
  id: string;
  liker_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  } | null;
}

interface MatchRow {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string | null;
}

interface MessageRow {
  id: string;
  match_id: string | null;
  sender_id: string;
  content: string;
  created_at: string | null;
}

interface ProfileMap {
  [key: string]: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  };
}

const ActivityFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});

  const loadActivity = useCallback(
    async (pageNum = 0, append = false) => {
      if (!user) return;
      try {
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const [likesRes, matchesRes, messagesRes] = await Promise.all([
          supabase
            .from("likes")
            .select(
              "id, liker_id, created_at, profiles!likes_liker_id_fkey (id, full_name, profile_image_url)"
            )
            .eq("liked_id", user.id)
            .order("created_at", { ascending: false })
            .range(from, to),
          supabase
            .from("matches")
            .select("id, user1_id, user2_id, created_at")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .order("created_at", { ascending: false })
            .range(from, to),
          supabase
            .from("messages")
            .select("id, match_id, sender_id, content, created_at")
            .eq("receiver_id", user.id)
            .not("match_id", "is", null)
            .order("created_at", { ascending: false })
            .range(from, to),
        ]);

        if (likesRes.error || matchesRes.error || messagesRes.error) {
          throw likesRes.error || matchesRes.error || messagesRes.error;
        }

        const newLikes = (likesRes.data || []) as LikeRow[];
        const newMatches = (matchesRes.data || []) as MatchRow[];
        const newMessages = (messagesRes.data || []) as MessageRow[];

        // Determine if any source still has more rows
        const fetchedMax = Math.max(newLikes.length, newMatches.length, newMessages.length);
        setHasMore(fetchedMax === PAGE_SIZE);

        if (append) {
          setLikes((prev) => [...prev, ...newLikes]);
          setMatches((prev) => [...prev, ...newMatches]);
          setMessages((prev) => [...prev, ...newMessages]);
        } else {
          setLikes(newLikes);
          setMatches(newMatches);
          setMessages(newMessages);
        }

        const matchPartnerIds = (matchesRes.data || []).map((m) =>
          m.user1_id === user.id ? m.user2_id : m.user1_id
        );

        const messageSenderIds = (messagesRes.data || []).map((m) => m.sender_id);
        const idsToFetch = Array.from(new Set([...matchPartnerIds, ...messageSenderIds])).filter(
          Boolean
        );

        if (idsToFetch.length) {
          const { data: profileRows, error } = await supabase
            .from("profiles")
            .select("id, full_name, profile_image_url")
            .in("id", idsToFetch);

          if (error) throw error;
          const mapped: ProfileMap = {};
          (profileRows || []).forEach((p) => {
            mapped[p.id] = p as ProfileMap[string];
          });
          setProfiles((prev) => ({ ...prev, ...mapped }));
        }
      } catch (error) {
        logger.error("Activity feed error", error);
        toast.error(t("activityFeed.failedLoad"));
      }
    },
    [user, t]
  );

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    setPage(0);
    loadActivity(0, false).finally(() => setLoading(false));
  }, [user, navigate, loadActivity]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadActivity(nextPage, true);
    setLoadingMore(false);
  };

  const combined = useMemo(() => {
    const likeItems = likes.map((like) => ({
      type: "like" as const,
      id: like.id,
      created_at: like.created_at,
      profile: like.profiles || null,
    }));
    const matchItems = matches.map((match) => {
      const otherId = match.user1_id === user?.id ? match.user2_id : match.user1_id;
      return {
        type: "match" as const,
        id: match.id,
        created_at: match.created_at || "",
        profile: otherId ? profiles[otherId] : null,
        matchId: match.id,
      };
    });
    const messageItems = messages.map((message) => ({
      type: "message" as const,
      id: message.id,
      created_at: message.created_at || "",
      profile: profiles[message.sender_id] || null,
      matchId: message.match_id || "",
      content: message.content,
    }));

    return [...likeItems, ...matchItems, ...messageItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [likes, matches, messages, profiles, user]);

  const renderItem = (item: (typeof combined)[number]) => {
    const name = item.profile?.full_name || "Someone";
    const image = item.profile?.profile_image_url || "/placeholder.svg";

    if (item.type === "like") {
      return {
        icon: <Heart className="h-5 w-5 text-rose-500" />,
        title: t("activityFeed.likedYou", { name }),
        action: () => navigate("/notifications"),
        actionLabel: t("activityFeed.view"),
        image,
      };
    }

    if (item.type === "match") {
      return {
        icon: <Users className="h-5 w-5 text-primary" />,
        title: t("activityFeed.matchedWith", { name }),
        action: () => navigate(`/chat/${item.matchId}`),
        actionLabel: t("activityFeed.matchChat"),
        image,
      };
    }

    return {
      icon: <MessageSquare className="h-5 w-5 text-emerald-500" />,
      title: t("activityFeed.sentMessage", { name }),
      subtitle: item.content,
      action: () => navigate(`/chat/${item.matchId}`),
      actionLabel: t("activityFeed.reply"),
      image,
    };
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Activity className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("activityFeed.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("activityFeed.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border border-white/6 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            {t("common.loading")}
          </Card>
        ) : combined.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border border-white/6 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold text-lg mb-1">{t("activityFeed.noActivity")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("activityFeed.noActivityDesc")}
            </p>
            <Button onClick={() => navigate("/discover")}>{t("activityFeed.discoverProfiles")}</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {combined.map((item) => {
              const view = renderItem(item);
              return (
                <Card
                  key={`${item.type}-${item.id}`}
                  className="p-4 rounded-2xl border border-white/6 shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={view.image}
                      alt={view.title}
                      className="h-14 w-14 rounded-full object-cover ring-1 ring-white/10 ring-offset-1 ring-offset-background"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {view.icon}
                        <p className="font-semibold text-foreground">{view.title}</p>
                      </div>
                      {"subtitle" in view && view.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {view.subtitle}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-white/15 hover:bg-white/8"
                      onClick={view.action}
                    >
                      {view.actionLabel}
                    </Button>
                  </div>
                </Card>
              );
            })}
            {hasMore && (
              <Button
                variant="outline"
                className="w-full rounded-xl mt-2"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t("common.loading") : t("activityFeed.loadMore")}
              </Button>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ActivityFeed;
