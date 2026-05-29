import { Heart, Quote, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import albanianEagle from "@/assets/albanian-eagle.png";

const stories = [
  {
    id: 1,
    names: "Arta & Erion",
    location: "Tirana → London",
    text: "We matched on Shqiponja while I was visiting family in Tirana. Erion sent me a funny opener about our shared love of byrek. Six months later, I moved back to Albania. We got engaged last spring.",
    time: "Together 2 years",
    emoji: "💍",
  },
  {
    id: 2,
    names: "Drita & Alban",
    location: "New York → Prishtina",
    text: "I never thought I'd find someone who understood both my Albanian roots and my New York upbringing. Shqiponja's matching algorithm paired us because we both listed 'family values' and 'hip-hop' as interests. Perfect combination!",
    time: "Married since 2023",
    emoji: "👰",
  },
  {
    id: 3,
    names: "Florina & Besnik",
    location: "Shkodër, Albania",
    text: "We were both on the Radar feature and kept popping up as nearby. After the third time the app 'spotted' us near the same café, Besnik finally asked me for coffee in real life. Best coffee of my life.",
    time: "Together 14 months",
    emoji: "☕",
  },
  {
    id: 4,
    names: "Vjosa & Kujtim",
    location: "Malmö → Prishtina",
    text: "We video-called for three months before meeting in person. Shqiponja's AI Matchmaker suggested we were 94% compatible. It was right. We're planning our wedding this October.",
    time: "Engaged 2024",
    emoji: "💛",
  },
];

const LoveStories = () => {
  return (
    <section className="py-24 relative overflow-hidden" id="love-stories">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <div className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            <img src={albanianEagle} alt="" role="presentation" className="w-4 h-4 opacity-80" />
            Real Stories
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-serif">
            Love Found Through <span className="text-gradient-fire">Shqiponja</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-base">
            Thousands of Albanian couples found their person here. These are just a few of their
            stories.
          </p>
        </div>

        {/* Stories grid */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {stories.map((story) => (
            <Card
              key={story.id}
              className="relative p-6 rounded-2xl bg-card/60 backdrop-blur border border-border/50 hover:border-primary/30 transition-colors space-y-4"
            >
              {/* Quote icon */}
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />

              {/* Story text */}
              <p className="text-sm leading-relaxed text-foreground/80 italic">"{story.text}"</p>

              {/* Footer */}
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <Avatar className="h-10 w-10 bg-primary/10 text-primary font-bold">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {story.emoji}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{story.names}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{story.location}</span>
                    <span>·</span>
                    <span className="text-primary">{story.time}</span>
                  </div>
                </div>
                <Heart className="h-4 w-4 text-primary fill-primary shrink-0" />
              </div>
            </Card>
          ))}
        </div>

        {/* Social proof counter */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm">
            Join <span className="text-foreground font-semibold">50,000+</span> Albanian singles who
            found their <span className="text-primary font-semibold">dashuri</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default LoveStories;
