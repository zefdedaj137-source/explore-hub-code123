import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "🏔️", label: "Adventurous" },
  { emoji: "🎉", label: "Party mode" },
  { emoji: "☕", label: "Chill vibes" },
  { emoji: "💪", label: "Motivated" },
  { emoji: "🎵", label: "Musical" },
  { emoji: "📚", label: "Bookish" },
  { emoji: "🍕", label: "Foodie" },
  { emoji: "🌅", label: "Romantic" },
  { emoji: "🏋️", label: "Gym time" },
  { emoji: "🎬", label: "Movie night" },
  { emoji: "✈️", label: "Wanderlust" },
  { emoji: "🎮", label: "Gaming" },
  { emoji: "🧘", label: "Zen" },
  { emoji: "🔥", label: "On fire" },
  { emoji: "😴", label: "Sleepy" },
];

const MoodStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedEmoji, setSelectedEmoji] = useState("😊");
  const [moodText, setMoodText] = useState("");
  const [savedMood, setSavedMood] = useState<{ emoji: string; text: string; date: string } | null>(
    null
  );

  const loadMood = useCallback(async () => {
    if (!user) return;
    // Try loading from DB first
    const { data } = (await supabase
      .from("profiles")
      .select("mood_emoji, mood_text, mood_updated_at" as "*")
      .eq("id", user.id)
      .single()) as {
      data: { mood_emoji?: string; mood_text?: string; mood_updated_at?: string } | null;
    };

    if (data?.mood_emoji && data.mood_updated_at) {
      const today = new Date().toDateString();
      const moodDate = new Date(data.mood_updated_at).toDateString();
      if (moodDate === today) {
        setSavedMood({ emoji: data.mood_emoji, text: data.mood_text || "", date: today });
        setSelectedEmoji(data.mood_emoji);
        setMoodText(data.mood_text || "");
        return;
      }
    }
    // Fallback to localStorage
    const stored = localStorage.getItem(`mood_${user.id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      const today = new Date().toDateString();
      if (parsed.date === today) {
        setSavedMood(parsed);
        setSelectedEmoji(parsed.emoji);
        setMoodText(parsed.text);
      }
    }
  }, [user]);

  useEffect(() => {
    loadMood();
  }, [loadMood]);

  const saveMood = async () => {
    if (!user) return;
    const mood = { emoji: selectedEmoji, text: moodText, date: new Date().toDateString() };
    localStorage.setItem(`mood_${user.id}`, JSON.stringify(mood));
    setSavedMood(mood);

    // Save to DB so other users can see it
    await supabase
      .from("profiles")
      .update({
        mood_emoji: selectedEmoji,
        mood_text: moodText || null,
        mood_updated_at: new Date().toISOString(),
      } as never)
      .eq("id", user.id);

    toast.success("Mood set! " + selectedEmoji);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-yellow-50 to-orange-50 pb-24">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Smile className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Daily Mood</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {savedMood && (
          <Card className="p-6 text-center bg-gradient-to-br from-yellow-100 to-orange-100">
            <p className="text-6xl mb-2">{savedMood.emoji}</p>
            <p className="text-lg font-semibold">{savedMood.text || "Feeling good!"}</p>
            <p className="text-sm text-muted-foreground mt-1">Today's mood</p>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Pick your mood</h2>
          <div className="grid grid-cols-4 gap-3">
            {MOODS.map((m) => (
              <button
                key={m.emoji}
                onClick={() => setSelectedEmoji(m.emoji)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedEmoji === m.emoji
                    ? "bg-yellow-100 ring-2 ring-yellow-400 scale-110"
                    : "bg-background hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <p className="text-[10px] mt-1 text-muted-foreground">{m.label}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Add a status text</h2>
          <Input
            placeholder="What's on your mind? e.g. Looking for brunch buddies 🥞"
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground text-right">{moodText.length}/60</p>
          <Button
            onClick={saveMood}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Set Mood {selectedEmoji}
          </Button>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default MoodStatus;
