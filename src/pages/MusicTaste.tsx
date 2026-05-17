import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Music, Plus, X, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const GENRES = [
  "Pop",
  "Rock",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Jazz",
  "Classical",
  "Country",
  "Reggaeton",
  "K-Pop",
  "Indie",
  "Metal",
  "Latin",
  "Soul",
  "Blues",
  "Folk",
  "Punk",
  "Disco",
  "Techno",
  "Afrobeat",
];

const MusicTaste = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topArtists, setTopArtists] = useState<string[]>([]);
  const [artistInput, setArtistInput] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [anthem, setAnthem] = useState("");

  const loadData = useCallback(() => {
    if (!user) return;
    const stored = localStorage.getItem(`music_${user.id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setTopArtists(parsed.artists || []);
      setSelectedGenres(parsed.genres || []);
      setAnthem(parsed.anthem || "");
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addArtist = () => {
    if (!artistInput.trim()) return;
    if (topArtists.length >= 5) {
      toast.error("Max 5 artists");
      return;
    }
    if (topArtists.includes(artistInput.trim())) {
      toast.error("Already added");
      return;
    }
    setTopArtists([...topArtists, artistInput.trim()]);
    setArtistInput("");
  };

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(selectedGenres.filter((x) => x !== g));
    } else {
      if (selectedGenres.length >= 5) {
        toast.error("Max 5 genres");
        return;
      }
      setSelectedGenres([...selectedGenres, g]);
    }
  };

  const save = () => {
    if (!user) return;
    localStorage.setItem(
      `music_${user.id}`,
      JSON.stringify({ artists: topArtists, genres: selectedGenres, anthem })
    );
    toast.success("Music taste saved! 🎵");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-emerald-50 pb-24">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Music className="h-5 w-5 text-green-500" />
        <h1 className="text-lg font-bold">Music Taste</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" /> Top Artists (max 5)
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Add an artist..."
              value={artistInput}
              onChange={(e) => setArtistInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addArtist()}
            />
            <Button size="icon" onClick={addArtist}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {topArtists.map((a) => (
              <Badge
                key={a}
                variant="secondary"
                className="px-3 py-1 text-sm flex items-center gap-1"
              >
                🎤 {a}
                <button
                  title="Remove artist"
                  onClick={() => setTopArtists(topArtists.filter((x) => x !== a))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Favorite Genres</h2>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedGenres.includes(g)
                    ? "bg-green-500 text-white"
                    : "bg-muted text-foreground hover:bg-muted"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">🎶 Profile Anthem</h2>
          <Input
            placeholder="Song that describes you, e.g. Blinding Lights - The Weeknd"
            value={anthem}
            onChange={(e) => setAnthem(e.target.value)}
            maxLength={80}
          />
        </Card>

        <Button onClick={save} className="w-full bg-green-500 hover:bg-green-600 text-white">
          Save Music Taste 🎵
        </Button>
      </div>
      <BottomNav />
    </div>
  );
};

export default MusicTaste;
