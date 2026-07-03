import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, ArrowLeft, Clock, Heart, Navigation, Users, Zap, Crown, Eye } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { formatTimeAgo, isOnline } from "@/utils/discover-utils";
import { logger } from "@/lib/logger";
import BottomNav from "@/components/BottomNav";

interface SpottedPerson {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  verified: boolean | null;
  is_premium: boolean | null;
  latitude: number | null;
  longitude: number | null;
  location: string;
  last_active: string | null;
  distance_m: number;
  spotted_at: string;
}

// Haversine distance in metres between two lat/lng points
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatMetres(m: number): string {
  if (m < 1000) return `${Math.round(m)}m away`;
  return `${(m / 1000).toFixed(1)}km away`;
}

const SPOTTED_RADIUS_M = 500;
const SPOTTED_WINDOW_DAYS = 7;

const Spotted = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [spotted, setSpotted] = useState<SpottedPerson[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Fetch my stored location from profile
  const fetchMyLocation = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", user.id)
      .single();
    if (error || !data?.latitude || !data?.longitude) {
      setLocationError("Enable location on the Radar page first to use Spotted.");
      setLoading(false);
      return;
    }
    setMyLocation({ lat: data.latitude, lng: data.longitude });
  }, [user]);

  // Fetch profiles that were recently near me
  const fetchSpotted = useCallback(
    async (lat: number, lng: number) => {
      if (!user) return;
      setLoading(true);

      // Use Supabase PostGIS or manual filter within bounding box (~0.005° ≈ 500m)
      const delta = 0.0045; // ~500m in degrees latitude
      const cutoff = new Date(Date.now() - SPOTTED_WINDOW_DAYS * 86400 * 1000).toISOString();

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, age, profile_image_url, verified, is_premium, latitude, longitude, location, last_active"
        )
        .neq("id", user.id)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .gte("latitude", lat - delta)
        .lte("latitude", lat + delta)
        .gte("longitude", lng - delta)
        .lte("longitude", lng + delta)
        .gte("last_active", cutoff)
        .limit(50);

      if (error) {
        logger.error("Spotted fetch error:", error);
        setLoading(false);
        return;
      }

      // Filter to real crossing radius and build result
      const results: SpottedPerson[] = (data || [])
        .map((p) => ({
          ...p,
          verified: p.verified ?? false,
          is_premium: p.is_premium ?? false,
          distance_m: haversineMetres(lat, lng, p.latitude!, p.longitude!),
          spotted_at: p.last_active ?? new Date().toISOString(),
        }))
        .filter((p) => p.distance_m <= SPOTTED_RADIUS_M)
        .sort((a, b) => a.distance_m - b.distance_m);

      setSpotted(results);
      setLoading(false);
    },
    [user]
  );

  useEffect(() => {
    fetchMyLocation();
  }, [fetchMyLocation]);

  useEffect(() => {
    if (myLocation) {
      fetchSpotted(myLocation.lat, myLocation.lng);
    }
  }, [myLocation, fetchSpotted]);

  const handleLike = async (personId: string) => {
    if (!user) return;
    if (likedIds.has(personId)) return;

    const { error } = await supabase.from("likes").insert({
      liker_id: user.id,
      liked_id: personId,
    });

    if (error) {
      if (error.code !== "23505") {
        toast.error("Failed to like. Try again.");
      }
      return;
    }

    setLikedIds((prev) => new Set([...prev, personId]));
    toast.success("💛 Liked! They'll see your interest.");
  };

  const handleRequestLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        if (!user) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const { error } = await supabase
          .from("profiles")
          .update({ latitude: lat, longitude: lng, location: `${lat},${lng}` })
          .eq("id", user.id);
        if (error) {
          toast.error("Failed to save your location. Please try again.");
          return;
        }
        setMyLocation({ lat, lng });
        setLocationError(null);
      },
      () => toast.error("Location access denied. Please enable it in your browser settings.")
    );
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Spotted
            </h1>
            <p className="text-xs text-muted-foreground">People you've crossed paths with</p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            <Users className="h-3 w-3 mr-1" />
            {spotted.length}
          </Badge>
        </div>
      </div>

      <div className="container max-w-lg mx-auto px-4 py-6">
        {/* Location error state */}
        {locationError ? (
          <Card className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{t("spotted.locationRequired")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{locationError}</p>
            </div>
            <Button
              onClick={handleRequestLocation}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {t("spotted.enableLocation")}
            </Button>
          </Card>
        ) : loading ? (
          /* Skeleton loading */
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : spotted.length === 0 ? (
          /* Empty state */
          <Card className="p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Eye className="h-10 w-10 text-primary/60" />
            </div>
            <div>
              <h2 className="font-semibold text-xl">{t("spotted.noOneSpottedYet")}</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                {t("spotted.noOneSpottedDesc", {
                  radius: SPOTTED_RADIUS_M,
                  days: SPOTTED_WINDOW_DAYS,
                })}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/radar")} className="w-full">
              <Navigation className="h-4 w-4 mr-2" />
              {t("spotted.goToRadar")}
            </Button>
          </Card>
        ) : (
          /* Spotted list */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground px-1">
              {t("spotted.showingPeople", { radius: SPOTTED_RADIUS_M, days: SPOTTED_WINDOW_DAYS })}
            </p>
            {spotted.map((person) => (
              <Card
                key={person.id}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/profile/${person.id}`)}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={person.profile_image_url ?? undefined} />
                    <AvatarFallback className="text-lg font-semibold bg-primary/10">
                      {person.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {person.verified && (
                    <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </span>
                  )}
                  {isOnline(person.last_active) && (
                    <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm truncate">{person.full_name}</span>
                    <span className="text-xs text-muted-foreground">{person.age}</span>
                    {person.is_premium && <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-primary flex items-center gap-0.5">
                      <Zap className="h-3 w-3" />
                      {person.distance_m < 1000
                        ? t("common.mAway", { m: Math.round(person.distance_m) })
                        : t("common.kmAway", { km: (person.distance_m / 1000).toFixed(1) })}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(person.spotted_at)}
                    </span>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant={likedIds.has(person.id) ? "default" : "outline"}
                  className={`shrink-0 rounded-full h-10 w-10 ${
                    likedIds.has(person.id)
                      ? "bg-primary text-white border-primary"
                      : "border-primary/40 text-primary hover:bg-primary hover:text-white"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(person.id);
                  }}
                >
                  <Heart className={`h-4 w-4 ${likedIds.has(person.id) ? "fill-current" : ""}`} />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Spotted;
