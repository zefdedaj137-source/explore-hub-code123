import { MapPin, Heart, X, Navigation, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportUserDialog from "@/components/ReportUserDialog";
import { useTranslation } from "react-i18next";
import { translateInterest } from "@/utils/translateInterest";

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
    <div className="overflow-hidden group rounded-3xl relative profile-card-bg card-tilt animate-card-enter">
      <div className="relative aspect-[3/4]">
        <img
          src={image}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
        />
        {/* Multi-stop cinematic gradient: strong bottom, subtle top vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 via-60% to-black/20 to-0%" />

        {profileId && currentUserId && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 bg-black/25 hover:bg-black/55 text-white/75 rounded-full backdrop-blur-md border border-white/10 transition-all duration-150"
            onClick={() => setShowReportDialog(true)}
            aria-label={t("profileCard.reportUser")}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          {/* Name + age row */}
          <div className="flex items-baseline gap-2 mb-1.5">
            <h3 className="text-[28px] font-extrabold tracking-tight leading-none text-shadow-dark">
              {name}
            </h3>
            <span className="text-2xl font-light opacity-80 leading-none">{age}</span>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {verified && (
              <Badge
                className="border-none text-[10px] px-2.5 py-0.5 h-5 font-bold rounded-full tracking-wide"
                style={{
                  background: "linear-gradient(135deg, #e8274b, #ff6b35)",
                  boxShadow: "0 2px 12px rgba(232,39,75,0.5)",
                }}
              >
                ✓ {t("profileCard.verified")}
              </Badge>
            )}
            {travelModeActive && travelCity && (
              <Badge className="bg-sky-500/85 text-white border-none backdrop-blur-sm text-[10px] px-2 py-0.5 h-5 font-semibold rounded-full">
                ✈ {t("profileCard.traveling")}
              </Badge>
            )}
          </div>

          {/* Location / distance row */}
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium mb-2">
            {travelModeActive && travelCity ? (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                <span className="text-xs">✈️</span>
                <span className="text-white/90">
                  {t("profileCard.travelingIn", { city: travelCity })}
                </span>
              </div>
            ) : displayCity ? (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                <MapPin className="h-3.5 w-3.5 text-white/70" />
                <span className="text-white/90">{displayCity}</span>
              </div>
            ) : null}
            {distanceKm !== undefined && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                <Navigation className="h-3 w-3 text-white/70" />
                <span className="text-white/90">
                  {distanceKm.toFixed(1)} {t("profileCard.kmAway")}
                </span>
              </div>
            )}
          </div>

          {/* Zodiac / religion */}
          {(zodiacSign || religion) && (
            <div className="flex gap-1.5 mb-2">
              {zodiacSign && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 bg-white/10 text-white border-white/15 text-[11px] font-semibold backdrop-blur-sm"
                >
                  ✨ {zodiacSign}
                </Badge>
              )}
              {religion && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 bg-white/10 text-white border-white/15 text-[11px] font-semibold backdrop-blur-sm"
                >
                  🕊️ {religion}
                </Badge>
              )}
            </div>
          )}

          {/* Interest tags */}
          <div className="flex flex-wrap gap-1.5">
            {interests.slice(0, 3).map((interest) => (
              <Badge
                key={interest}
                className="rounded-full px-3 py-1 bg-primary/25 text-white border-primary/30 text-[11px] font-semibold backdrop-blur-sm"
              >
                {translateInterest(interest, t)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 py-3 flex gap-3 justify-center profile-action-bar">
        <Button
          size="lg"
          variant="ghost"
          className="flex-1 rounded-2xl font-semibold btn-press hover:scale-[1.03] active:scale-[0.97]"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          <X className="h-4 w-4 mr-2" />
          {t("discover.pass")}
        </Button>
        <Button
          size="lg"
          className="flex-1 rounded-2xl font-bold text-white border-0 btn-press animate-ripple"
          style={{
            background: "linear-gradient(135deg, #e8274b 0%, #ff6b35 100%)",
            boxShadow: "0 6px 24px rgba(232,39,75,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
            transition: "box-shadow 0.15s ease",
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
