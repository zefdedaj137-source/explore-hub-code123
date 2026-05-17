import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap } from "lucide-react";
import { formatDistance } from "@/lib/distance";
import type { Profile } from "@/types/profile";

interface ProfileGridCardProps {
  profile: Profile;
  onClick: () => void;
  priority?: boolean;
}

export const ProfileGridCard = memo(
  ({ profile, onClick, priority = false }: ProfileGridCardProps) => (
    <Card
      className="overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.3)] transition-all duration-300 cursor-pointer border-0 rounded-3xl"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] bg-gradient-to-br from-background via-muted to-primary/20">
        {profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt={profile.full_name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding={priority ? "sync" : "async"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center">
            <span className="text-6xl text-white">{profile.full_name[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Boost badge */}
        <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-full p-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" fill="currentColor" />
        </div>

        {/* Active status */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-white font-medium">Active</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] truncate">
              {profile.full_name}
            </h3>
            <span className="text-lg font-light opacity-90 flex-shrink-0">{profile.age}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 mb-2">
            {profile.verified && (
              <Badge className="bg-primary text-white border-none text-[10px] px-1.5 py-0 h-4">
                \u2713 Verified
              </Badge>
            )}
          </div>
          {profile.travel_mode_active && profile.travel_city ? (
            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-2.5 py-0.5 rounded-full text-xs w-fit">
              <span>✈️</span>
              <span className="truncate">{profile.travel_city}</span>
            </div>
          ) : profile.city ? (
            <div className="flex items-center gap-1 backdrop-blur-sm bg-card/10 px-2.5 py-0.5 rounded-full text-xs w-fit">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{profile.city}</span>
            </div>
          ) : null}
          {profile.distance_km && (
            <div className="backdrop-blur-sm bg-card/10 px-2.5 py-0.5 rounded-full text-xs w-fit mt-1">
              {formatDistance(profile.distance_km)} away
            </div>
          )}
        </div>
      </div>
    </Card>
  )
);

ProfileGridCard.displayName = "ProfileGridCard";
