import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface SavedMatch {
  bookmark_id: string;
  match_id: string;
  profile: {
    id: string;
    full_name: string;
    age: number;
    profile_image_url: string | null;
    city?: string | null;
    country?: string | null;
  };
}

const SavedProfiles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [savedMatches, setSavedMatches] = useState<SavedMatch[]>([]);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get bookmarked match IDs
      const { data: bookmarks, error: bErr } = await supabase
        .from("bookmarked_matches")
        .select("id, match_id")
        .eq("user_id", user.id);

      if (bErr) throw bErr;
      if (!bookmarks || bookmarks.length === 0) {
        setSavedMatches([]);
        return;
      }

      const matchIds = bookmarks.map((b) => b.match_id);

      // Get match rows to find the other user
      const { data: matchRows, error: mErr } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id")
        .in("id", matchIds);

      if (mErr) throw mErr;

      const otherUserIds = (matchRows || []).map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      // Get profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, age, profile_image_url, city, country")
        .in("id", otherUserIds);

      if (pErr) throw pErr;

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const results: SavedMatch[] = [];
      for (const bookmark of bookmarks) {
        const match = matchRows?.find((m) => m.id === bookmark.match_id);
        if (!match) continue;
        const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id;
        const profile = profileMap.get(otherId);
        if (!profile) continue;
        results.push({
          bookmark_id: bookmark.id,
          match_id: bookmark.match_id,
          profile,
        });
      }

      setSavedMatches(results);
    } catch (err) {
      logger.error("Failed to load saved profiles", err);
      toast.error(t("savedProfiles.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchSaved();
  }, [user, navigate, fetchSaved]);

  const removeSaved = async (bookmarkId: string) => {
    const { error } = await supabase.from("bookmarked_matches").delete().eq("id", bookmarkId);

    if (error) {
      toast.error(t("savedProfiles.failedRemoveBookmark"));
      return;
    }
    setSavedMatches((prev) => prev.filter((s) => s.bookmark_id !== bookmarkId));
    toast.success(t("savedProfiles.bookmarkRemoved"));
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bookmark className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("savedProfiles.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("savedProfiles.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">{t("common.loading")}</Card>
        ) : savedMatches.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">
            {t("savedProfiles.noSaved")}
          </Card>
        ) : (
          <div className="space-y-4">
            {savedMatches.map((item) => (
              <Card key={item.bookmark_id} className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-4">
                  <img
                    src={item.profile.profile_image_url || "/placeholder.svg"}
                    alt={item.profile.full_name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-border"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {item.profile.full_name}, {item.profile.age}
                    </p>
                    {(item.profile.city || item.profile.country) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {[item.profile.city, item.profile.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => navigate(`/chat/${item.match_id}`)}>
                      {t("savedProfiles.openChat")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeSaved(item.bookmark_id)}
                    >
                      {t("savedProfiles.remove")}
                    </Button>
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

export default SavedProfiles;
