import { MapPin, Heart, X, CheckCircle2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TravelModeBadge } from "@/components/TravelModeBadge";

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
}

const ProfileCard = ({ 
  name, age, location, city, country, distanceKm, bio, interests, image, verified, zodiacSign, religion, travelModeActive, travelCity
}: ProfileCardProps) => {
  const displayCity = travelModeActive && travelCity ? travelCity : city || location;
  
  return (
    <Card className="overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 group">
      <div className="relative aspect-[3/4] overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-serif text-3xl font-bold">
              {name}, {age}
            </h3>
            {verified && (
              <CheckCircle2 className="h-6 w-6 text-accent fill-accent" />
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm mb-2">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{displayCity}, {country}</span>
              {travelModeActive && <TravelModeBadge travelCity={travelCity} size="sm" />}
            </div>
            {distanceKm !== undefined && (
              <div className="flex items-center gap-1 px-2 py-1 bg-primary/80 rounded-full">
                <Navigation className="h-3 w-3" />
                <span className="font-semibold">{distanceKm.toFixed(1)} km</span>
              </div>
            )}
          </div>

          {(zodiacSign || religion) && (
            <div className="flex gap-2 mb-3 text-xs">
              {zodiacSign && (
                <Badge variant="secondary" className="bg-accent/20 backdrop-blur-sm text-white border-accent/30">
                  ✨ {zodiacSign}
                </Badge>
              )}
              {religion && (
                <Badge variant="secondary" className="bg-accent/20 backdrop-blur-sm text-white border-accent/30">
                  🕊️ {religion}
                </Badge>
              )}
            </div>
          )}
          
          <p className="text-sm text-white/90 mb-4 line-clamp-2">{bio}</p>
          <div className="flex flex-wrap gap-2">
            {interests.slice(0, 3).map((interest, index) => (
              <Badge 
                key={index}
                variant="secondary"
                className="bg-white/20 backdrop-blur-sm text-white border-white/30"
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 flex gap-3 justify-center bg-card">
        <Button 
          size="lg"
          variant="outline"
          className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-5 w-5 mr-2" />
          Pass
        </Button>
        <Button 
          size="lg"
          className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant"
        >
          <Heart className="h-5 w-5 mr-2 fill-current" />
          Like
        </Button>
      </div>
    </Card>
  );
};

export default ProfileCard;
