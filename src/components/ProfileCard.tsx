import { MapPin, Heart, X, Navigation, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportUserDialog from "@/components/ReportUserDialog";
import { useTranslation } from "react-i18next";

interface ProfileCardProps {
  name: string;
  age: number;
  location: string;
  city?: string;
  country?: string;
  distanceKm?: number;
  bio: string;
  interests: string[];
  image: string;
  verified?: boolean;
  zodiacSign?: string;
  religion?: string;
  travelModeActive?: boolean;
  travelCity?: string | null;
  profileId?: string;
  currentUserId?: string;
  priority?: boolean;
}

const ProfileCard = ({
  name,
  age,
  location,
  city,
  country,
  distanceKm,
  bio,
  interests,
  image,
  verified,
  zodiacSign,
  religion,
  travelModeActive,
  travelCity,
  profileId,
  currentUserId,
  priority,
}: ProfileCardProps) => {
  const displayCity = travelModeActive && travelCity ? travelCity : city || location;
  const [showReportDialog, setShowReportDialog] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden transition-all duration-500 group rounded-3xl relative profile-card-bg">
      <div className="relative aspect-[3/4]">
        <img
          src={image}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent" />

        {profileId && currentUserId && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 bg-black/30 hover:bg-black/60 text-white/80 rounded-full backdrop-blur-sm"
            onClick={() => setShowReportDialog(true)}
            aria-label={t("profileCard.reportUser")}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-3xl font-extrabold tracking-tight text-shadow-dark">{name}</h3>
            <span className="text-2xl font-light opacity-85">{age}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 mb-2">
            {verified && (
              <Badge
                className="border-none text-[10px] px-2 py-0.5 h-5 font-semibold rounded-full"
                style={{
                  background: "linear-gradient(135deg, #e8274b, #ff6b35)",
                  boxShadow: "0 2px 10px rgba(232,39,75,0.4)",
                }}
              >
                {t("profileCard.verified")}
              </Badge>
            )}
            {travelModeActive && travelCity && (
              <Badge className="bg-blue-500/90 text-white border-none backdrop-blur-sm text-[10px] px-1.5 py-0 h-4">
                {t("profileCard.traveling")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm font-medium mb-2">
            {travelModeActive && travelCity ? (
              <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                <span>✈️</span>
                <span>{t("profileCard.travelingIn", { city: travelCity })}</span>
              </div>
            ) : displayCity ? (
              <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                <MapPin className="h-4 w-4" />
                <span>{displayCity}</span>
              </div>
            ) : null}
            {distanceKm !== undefined && (
              <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                <Navigation className="h-3.5 w-3.5" />
                <span>{distanceKm.toFixed(1)} {t("profileCard.kmAway")}</span>
              </div>
            )}
          </div>

          {(zodiacSign || religion) && (
            <div className="flex gap-1.5 mb-2 text-xs">
              {zodiacSign && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                >
                  ✨ {zodiacSign}
                </Badge>
              )}
              {religion && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                >
                  🕊️ {religion}
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {interests.slice(0, 3).map((interest) => (
              <Badge
                key={interest}
                variant="secondary"
                className="rounded-full px-3 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 flex gap-3 justify-center profile-action-bar">
        <Button
          size="lg"
          variant="ghost"
          className="flex-1 rounded-2xl font-semibold transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <X className="h-4 w-4 mr-2" />
          {t("discover.pass")}
        </Button>
        <Button
          size="lg"
          className="flex-1 rounded-2xl font-bold text-white border-0 transition-all duration-200 hover:scale-105 hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, #e8274b, #ff6b35)",
            boxShadow: "0 6px 20px rgba(232,39,75,0.45)",
          }}
        >
          <Heart className="h-5 w-5 mr-2 fill-current" />
          {t("discover.like")}
        </Button>
      </div>

      {profileId && currentUserId && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedId={profileId}
          reportedName={name}
          currentUserId={currentUserId}
          context="profile"
        />
      )}
    </div>
  );
};

export default ProfileCard;
