import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Star, Music, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DancingVideo {
  id: string;
  user_id: string;
  video_url: string;
  song_name: string;
  average_rating: number;
  total_ratings: number;
  created_at: string;
  profiles: {
    full_name: string;
    profile_image_url: string | null;
  };
}

export const VideoFeed = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [videos, setVideos] = useState<DancingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  const fetchVideos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("dancing_videos")
        .select(
          `
          *,
          profiles!dancing_videos_user_id_fkey (
            full_name,
            profile_image_url
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setVideos(data || []);

      // Fetch user's existing ratings
      if (user) {
        const { data: ratingsData } = await supabase
          .from("video_ratings")
          .select("video_id, rating")
          .eq("rater_id", user.id);

        const ratingsMap: Record<string, number> = {};
        ratingsData?.forEach((r) => {
          ratingsMap[r.video_id] = r.rating;
        });
        setUserRatings(ratingsMap);
        setRatingValues(ratingsMap);
      }
    } catch (error) {
      toast.error(t("videoIntro.failedLoadVideos"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchVideos();
  }, [refreshTrigger, fetchVideos]);

  const submitRating = async (videoId: string, rating: number) => {
    if (!user) {
      toast.error(t("videoIntro.loginToRate"));
      return;
    }

    try {
      const { error } = await supabase.from("video_ratings").upsert(
        {
          video_id: videoId,
          rater_id: user.id,
          rating,
        },
        {
          onConflict: "video_id,rater_id",
        }
      );

      if (error) throw error;

      setUserRatings((prev) => ({ ...prev, [videoId]: rating }));
      toast.success(t("dancing.rated", { rating }));

      // Refresh to get updated average
      setTimeout(fetchVideos, 500);
    } catch (error) {
      toast.error(t("videoIntro.failedRating"));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">{t("dancing.loadingVideos")}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-2xl font-bold mb-2">{t("dancing.noVideos")}</h3>
        <p className="text-muted-foreground">{t("dancing.beFirst")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {videos.map((video) => (
        <Card key={video.id} className="overflow-hidden">
          <div className="p-4 flex items-center gap-3 border-b">
            {video.profiles.profile_image_url ? (
              <img
                src={video.profiles.profile_image_url}
                alt={video.profiles.full_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-semibold">{video.profiles.full_name}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Music className="h-4 w-4" />
                <span>{video.song_name}</span>
              </div>
            </div>
            {video.total_ratings > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-current" />
                {video.average_rating.toFixed(1)} ({video.total_ratings})
              </Badge>
            )}
          </div>

          <video
            src={video.video_url}
            controls
            className="w-full aspect-video bg-gradient-to-br from-muted to-muted"
          />

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("dancing.rateDance")}</span>
              <span className="text-2xl font-bold text-primary">
                {ratingValues[video.id] || 0}/10
              </span>
            </div>

            <Slider
              value={[ratingValues[video.id] || 0]}
              onValueChange={(value) =>
                setRatingValues((prev) => ({ ...prev, [video.id]: value[0] }))
              }
              max={10}
              step={1}
              className="w-full"
            />

            <Button
              onClick={() => submitRating(video.id, ratingValues[video.id] || 0)}
              className="w-full bg-gradient-primary"
              disabled={user?.id === video.user_id || !ratingValues[video.id]}
            >
              {userRatings[video.id] ? "Update Rating" : "Submit Rating"}
            </Button>

            {user?.id === video.user_id && (
              <p className="text-sm text-muted-foreground text-center">
                You can't rate your own video
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
