import { MapPin, Heart, X, Navigation, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportUserDialog from "@/components/ReportUserDialog";

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

  return (
    <Card className="overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.3)] transition-all duration-500 group border-0 rounded-3xl bg-card">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-background via-muted to-primary/20">
        <img
          src={image}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {/* Single gradient — bottom up only */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {profileId && currentUserId && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 bg-black/30 hover:bg-black/60 text-white/80 rounded-full backdrop-blur-sm"
            onClick={() => setShowReportDialog(true)}
            aria-label="Report user"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              {name}
            </h3>
            <span className="text-2xl font-light opacity-90">{age}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 mb-2">
            {verified && (
              <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                ✓ Verified
              </Badge>
            )}
            {travelModeActive && travelCity && (
              <Badge className="bg-blue-500/90 text-white border-none backdrop-blur-sm text-[10px] px-1.5 py-0 h-4">
                ✈️ Traveling
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm font-medium mb-2">
            {travelModeActive && travelCity ? (
              <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-3 py-1 rounded-full">
                <span>✈️</span>
                <span>Traveling in {travelCity}</span>
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
                <span>{distanceKm.toFixed(1)} km away</span>
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

      <div className="px-4 py-3 flex gap-2.5 justify-center bg-card border-t border-white/5">
        <Button
          size="lg"
          variant="outline"
          className="flex-1 rounded-2xl border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-secondary/50 transition-all duration-200"
        >
          <X className="h-4 w-4 mr-2" />
          Pass
        </Button>
        <Button
          size="lg"
          className="flex-1 rounded-2xl bg-gradient-to-r from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] hover:brightness-110 text-white border-0 shadow-[0_4px_16px_hsl(350,65%,60%,0.35)] transition-all duration-200"
        >
          <Heart className="h-5 w-5 mr-2 fill-current" />
          Like
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
    </Card>
  );
};

export default ProfileCard;
