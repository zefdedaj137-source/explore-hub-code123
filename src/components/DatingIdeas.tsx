import { Card } from "@/components/ui/card";
import { Coffee, Utensils, MapPin, Music, Heart, Plane } from "lucide-react";
import { useTranslation } from "react-i18next";
import albanianEagle from "@/assets/albanian-eagle.png";

const datingIdeas = [
  {
    icon: Coffee,
    title: "Albanian Coffee Date",
    description:
      "Meet at a traditional Albanian café. Order a strong Turkish coffee and share byrek.",
    difficulty: "Easy",
    time: "1-2 hours",
  },
  {
    icon: Utensils,
    title: "Cook Together",
    description: "Prepare traditional dishes like Tavë Kosi or Fërgesë. Bond over family recipes.",
    difficulty: "Medium",
    time: "2-3 hours",
  },
  {
    icon: Music,
    title: "Albanian Concert",
    description: "Attend a live performance of Albanian folk music or modern artists.",
    difficulty: "Easy",
    time: "3-4 hours",
  },
  {
    icon: MapPin,
    title: "Cultural Walk",
    description: "Visit Albanian cultural centers, museums, or monuments in your city.",
    difficulty: "Easy",
    time: "2-3 hours",
  },
  {
    icon: Heart,
    title: "Language Exchange",
    description: "Teach each other Albanian phrases, poems, or share favorite Albanian literature.",
    difficulty: "Easy",
    time: "1-2 hours",
  },
  {
    icon: Plane,
    title: "Plan a Trip to Albania",
    description: "Dream together about visiting Tirana, Saranda, or the Albanian Riviera.",
    difficulty: "Fun",
    time: "Ongoing",
  },
];

const DatingIdeas = () => {
  const { t } = useTranslation();
  return (
    <section className="py-24 bg-gradient-subtle relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-10 w-32 h-32 opacity-5">
        <img src={albanianEagle} alt="" className="w-full h-full object-contain animate-pulse" />
      </div>
      <div className="absolute bottom-1/4 right-10 w-32 h-32 opacity-5">
        <img
          src={albanianEagle}
          alt=""
          className="w-full h-full object-contain animate-pulse [animation-delay:1s]"
        />
      </div>

      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-gold">{t("datingIdeas.titleWord1")}</span>{" "}
            <span className="text-foreground">{t("datingIdeas.titleWord2")}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Creative date ideas that celebrate Albanian culture and create memorable moments
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {datingIdeas.map((idea, index) => (
            <Card
              key={idea.title}
              className="p-8 hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-2 border-border bg-card group animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300 border-2 border-accent/30">
                  <idea.icon className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-gold transition-all duration-300">
                {idea.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed mb-6">{idea.description}</p>

              <div className="flex gap-3 pt-4 border-t border-border/30">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {idea.difficulty}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
                  {idea.time}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto p-8 bg-gradient-luxury border-2 border-accent/20 shadow-luxury">
            <Heart className="h-12 w-12 text-accent mx-auto mb-4 fill-accent" />
            <h3 className="text-2xl font-bold text-foreground mb-3">{t("datingIdeas.shareTitle")}</h3>
            <p className="text-muted-foreground mb-6">
              Have a unique Albanian date idea? Share it with the community and inspire other
              couples!
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold cursor-pointer hover:opacity-90 transition-opacity shadow-elegant border-2 border-accent/30">
              <Heart className="h-4 w-4" />
              <span>{t("datingIdeas.comingSoon")}</span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default DatingIdeas;
