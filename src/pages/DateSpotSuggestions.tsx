import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Coffee, UtensilsCrossed, Wine, Star, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface DateSpot {
  name: string;
  type: "cafe" | "restaurant" | "bar" | "activity" | "park";
  vibe: string;
  price: string;
  description: string;
  rating: number;
  emoji: string;
}

const SPOTS: DateSpot[] = [
  {
    name: "Cozy Corner Café",
    type: "cafe",
    vibe: "Chill & Intimate",
    price: "$$",
    description: "Perfect for a first date – warm lighting, great lattes, quiet enough to chat.",
    rating: 4.7,
    emoji: "☕",
  },
  {
    name: "Rooftop Sunset Bar",
    type: "bar",
    vibe: "Romantic",
    price: "$$$",
    description: "Stunning views, craft cocktails, live music on weekends.",
    rating: 4.8,
    emoji: "🍸",
  },
  {
    name: "Pasta Paradise",
    type: "restaurant",
    vibe: "Classic Italian",
    price: "$$",
    description: "Handmade pasta, candlelit tables, perfect for sharing dishes.",
    rating: 4.6,
    emoji: "🍝",
  },
  {
    name: "Adventure Park",
    type: "activity",
    vibe: "Fun & Active",
    price: "$",
    description: "Mini golf, go-karts, and ice cream – for playful dates!",
    rating: 4.5,
    emoji: "🎢",
  },
  {
    name: "Garden Walk & Picnic",
    type: "park",
    vibe: "Outdoor Romantic",
    price: "$",
    description: "Pack a picnic, stroll through the botanical garden together.",
    rating: 4.9,
    emoji: "🌸",
  },
  {
    name: "Sushi Express",
    type: "restaurant",
    vibe: "Casual",
    price: "$$",
    description: "Fun conveyor-belt sushi spot – great for conversation!",
    rating: 4.4,
    emoji: "🍣",
  },
  {
    name: "Wine & Paint Night",
    type: "activity",
    vibe: "Creative",
    price: "$$",
    description: "Paint together while sipping wine. What's not to love?",
    rating: 4.7,
    emoji: "🎨",
  },
  {
    name: "Brunch Bistro",
    type: "cafe",
    vibe: "Morning Date",
    price: "$$",
    description: "Mimosas, avocado toast, sunshine. Weekend morning magic.",
    rating: 4.6,
    emoji: "🥞",
  },
  {
    name: "Jazz Lounge",
    type: "bar",
    vibe: "Sophisticated",
    price: "$$$",
    description: "Live jazz, dim lights, signature cocktails. Very smooth.",
    rating: 4.8,
    emoji: "🎷",
  },
  {
    name: "Escape Room Challenge",
    type: "activity",
    vibe: "Adventurous",
    price: "$$",
    description: "Test your teamwork! Nothing bonds like solving puzzles together.",
    rating: 4.5,
    emoji: "🔐",
  },
  {
    name: "Farmer's Market Stroll",
    type: "park",
    vibe: "Casual & Fresh",
    price: "$",
    description: "Browse local food stalls, taste samples, and just vibe.",
    rating: 4.3,
    emoji: "🥑",
  },
  {
    name: "Dessert Bar",
    type: "cafe",
    vibe: "Sweet Tooth",
    price: "$$",
    description: "Share a ridiculous sundae or chocolate fondue. Sugar rush date!",
    rating: 4.6,
    emoji: "🍫",
  },
];

const DateSpotSuggestions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>("all");
  const [randomPick, setRandomPick] = useState<DateSpot | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadFavorites = useCallback(() => {
    if (!user) return;
    const stored = localStorage.getItem(`date_spots_fav_${user.id}`);
    if (stored) setFavorites(JSON.parse(stored));
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFav = (name: string) => {
    if (!user) return;
    const updated = favorites.includes(name)
      ? favorites.filter((f) => f !== name)
      : [...favorites, name];
    setFavorites(updated);
    localStorage.setItem(`date_spots_fav_${user.id}`, JSON.stringify(updated));
    toast.success(
      updated.includes(name) ? t("dateSpots.addedFavorite") : t("dateSpots.removedFavorite")
    );
  };

  const pickRandom = () => {
    const filtered = filter === "all" ? SPOTS : SPOTS.filter((s) => s.type === filter);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setRandomPick(pick);
    toast.success(t("dateSpots.randomPick", { name: pick.name, emoji: pick.emoji }));
  };

  const filtered = filter === "all" ? SPOTS : SPOTS.filter((s) => s.type === filter);

  const typeIcons: Record<string, string> = {
    cafe: "☕",
    restaurant: "🍽️",
    bar: "🍸",
    activity: "🎮",
    park: "🌳",
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-rose-50 to-pink-50 pb-24">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <MapPin className="h-5 w-5 text-rose-500" />
        <h1 className="text-lg font-bold">{t("dateSpots.title")}</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <Button
          onClick={pickRandom}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> {t("dateSpots.pickRandom")}
        </Button>

        {randomPick && (
          <Card className="p-4 bg-gradient-to-r from-rose-100 to-pink-100 border-2 border-rose-300">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{randomPick.emoji}</span>
              <div>
                <h3 className="font-bold">{randomPick.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {randomPick.vibe} · {randomPick.price}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{randomPick.description}</p>
          </Card>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          {["all", "cafe", "restaurant", "bar", "activity", "park"].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                filter === type
                  ? "bg-rose-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              {type === "all"
                ? t("dateSpots.filterAll")
                : `${typeIcons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((spot) => (
            <Card key={spot.name} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{spot.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{spot.name}</h3>
                    <button
                      onClick={() => toggleFav(spot.name)}
                      aria-label={
                        favorites.includes(spot.name)
                          ? t("dateSpots.removeFromFav")
                          : t("dateSpots.addToFav")
                      }
                    >
                      <Star
                        className={`h-5 w-5 ${favorites.includes(spot.name) ? "text-primary fill-yellow-500" : "text-muted-foreground"}`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {spot.vibe}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {spot.price}
                    </Badge>
                    <span className="text-xs text-muted-foreground">⭐ {spot.rating}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{spot.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default DateSpotSuggestions;
