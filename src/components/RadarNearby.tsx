import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Heart, X } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";
import albanianEagle from "@/assets/albanian-eagle.png";

import arberesheImg from "@/assets/arbereshe.jpg";
import flamurImg from "@/assets/flamur.jpg";
import dritaImg from "@/assets/drita.jpg";
import jozefImg from "@/assets/jozefi.jpg";

const nearbyProfiles = [
  { id: 1, name: "Arbëresha", age: 23, distance: 2.3, image: arberesheImg },
  { id: 2, name: "Flamur", age: 26, distance: 4.1, image: flamurImg },
  { id: 3, name: "Drita", age: 24, distance: 5.8, image: dritaImg },
  { id: 4, name: "Jozefi", age: 28, distance: 7.2, image: jozefImg },
];

const RadarNearby = () => {
  const [scanning, setScanning] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setShowProfiles(true);
    }, 2500);
  };

  return (
    <section id="nearby" className="py-24 bg-gradient-subtle relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-10 right-10 w-32 h-32 opacity-5">
        <img src={albanianEagle} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-gold">Radar</span>{" "}
            <span className="text-foreground">Nearby</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover Albanian singles in your area. Real-time location matching.
          </p>
        </div>

        {/* Radar Visual */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative aspect-square max-w-lg mx-auto">
            {/* Radar background */}
            <div className="absolute inset-0 rounded-full bg-gradient-eagle opacity-10 blur-2xl" />

            {/* Radar circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-full h-full rounded-full border-2 border-primary/20" />
              <div className="absolute w-3/4 h-3/4 rounded-full border-2 border-primary/30" />
              <div className="absolute w-1/2 h-1/2 rounded-full border-2 border-primary/40" />
              <div className="absolute w-1/4 h-1/4 rounded-full border-2 border-primary/50" />
            </div>

            {/* Center point with eagle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow border-4 border-accent/30">
                  <img src={albanianEagle} alt="You" className="w-10 h-10" />
                </div>
                {scanning && (
                  <div className="absolute inset-0 rounded-full border-4 border-accent animate-ping" />
                )}
              </div>
            </div>

            {/* Scanning beam */}
            {scanning && (
              <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-primary origin-left animate-spin shadow-glow [animation-duration:2s]" />
            )}

            {/* Nearby profile dots */}
            {showProfiles && (
              <>
                <div className="absolute top-[30%] left-[40%] w-4 h-4 rounded-full bg-accent shadow-glow animate-pulse" />
                <div className="absolute top-[45%] right-[25%] w-4 h-4 rounded-full bg-accent shadow-glow animate-pulse [animation-delay:0.2s]" />
                <div className="absolute bottom-[35%] left-[30%] w-4 h-4 rounded-full bg-accent shadow-glow animate-pulse [animation-delay:0.4s]" />
                <div className="absolute bottom-[40%] right-[35%] w-4 h-4 rounded-full bg-accent shadow-glow animate-pulse [animation-delay:0.6s]" />
              </>
            )}
          </div>

          <div className="text-center mt-8">
            <Button
              size="lg"
              onClick={handleScan}
              disabled={scanning}
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-elegant px-12 py-6 text-lg rounded-xl border-2 border-accent/20 transition-all hover:shadow-glow hover:scale-105"
            >
              <MapPin className="mr-2 h-5 w-5" />
              {scanning ? "Scanning..." : "Scan Nearby"}
            </Button>
          </div>
        </div>

        {/* Nearby Profiles Grid */}
        {showProfiles && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in">
            {nearbyProfiles.map((profile, index) => (
              <Card
                key={profile.id}
                className="overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_56px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-1.5 border border-white/6 bg-card rounded-3xl group animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  {/* Distance badge */}
                  <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md text-white/90 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-white/15">
                    <MapPin className="h-3 w-3" />
                    {profile.distance} km
                  </div>

                  {/* Profile info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold font-serif text-white mb-3">
                      {sanitizeText(profile.name)}, {profile.age}
                    </h3>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 hover:bg-white/20 rounded-xl h-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] text-white border-0 shadow-[0_4px_12px_hsl(350,65%,60%,0.35)] hover:brightness-110 rounded-xl h-9"
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        Like
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RadarNearby;
