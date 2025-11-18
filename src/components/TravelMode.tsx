import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, MapPin, X } from "lucide-react";
import { toast } from "sonner";

interface TravelModeProps {
  userId: string;
  isPremium: boolean;
  travelModeActive: boolean;
  travelCity: string | null;
  onTravelModeChange: () => void;
}

export const TravelMode = ({
  userId,
  isPremium,
  travelModeActive,
  travelCity,
  onTravelModeChange,
}: TravelModeProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const handleActivateTravelMode = async () => {
    if (!city || !country) {
      toast.error("Please enter both city and country");
      return;
    }

    setLoading(true);
    try {
      // Geocode the location using a free geocoding service
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
          city
        )}&country=${encodeURIComponent(country)}&format=json&limit=1`
      );
      const geocodeData = await geocodeResponse.json();

      if (!geocodeData || geocodeData.length === 0) {
        toast.error("Could not find that location. Please try again.");
        setLoading(false);
        return;
      }

      const { lat, lon, display_name } = geocodeData[0];

      const { data, error } = await supabase.rpc("activate_travel_mode", {
        p_user_id: userId,
        p_location: display_name,
        p_city: city,
        p_country: country,
        p_latitude: parseFloat(lat),
        p_longitude: parseFloat(lon),
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`✈️ Travel Mode activated! Now exploring ${city}`);
        setOpen(false);
        onTravelModeChange();
        setLocation("");
        setCity("");
        setCountry("");
      } else {
        toast.error(data?.error || "Failed to activate Travel Mode");
      }
    } catch (error) {
      console.error("Error activating travel mode:", error);
      toast.error("Failed to activate Travel Mode");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateTravelMode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("deactivate_travel_mode", {
        p_user_id: userId,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Travel Mode deactivated");
        onTravelModeChange();
      }
    } catch (error) {
      console.error("Error deactivating travel mode:", error);
      toast.error("Failed to deactivate Travel Mode");
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plane className="h-4 w-4" />
            Travel Mode
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✈️ Travel Mode - Premium Feature</DialogTitle>
            <DialogDescription>
              Travel Mode is only available for premium members. Upgrade to explore
              matches in different cities around the world!
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full">Upgrade to Premium</Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (travelModeActive) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 bg-blue-500 text-white hover:bg-blue-600"
        >
          <Plane className="h-4 w-4" />
          Traveling to {travelCity}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeactivateTravelMode}
          disabled={loading}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plane className="h-4 w-4" />
          Travel Mode
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>✈️ Activate Travel Mode</DialogTitle>
          <DialogDescription>
            Explore matches in a different city. You'll be shown to people in that
            location and see profiles from there.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="e.g., Paris, Tokyo, New York"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="e.g., France, Japan, USA"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={handleActivateTravelMode}
          disabled={loading || !city || !country}
          className="w-full"
        >
          {loading ? "Activating..." : "Start Traveling"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
