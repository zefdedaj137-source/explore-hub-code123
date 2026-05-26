import { Heart, Shield, Globe, Crown, MessageCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Heart,
      title: t("featuresComponent.culturalCompatibility"),
      description: t("featuresComponent.culturalCompatibilityDesc"),
    },
    {
      icon: Shield,
      title: t("featuresComponent.verifiedProfiles"),
      description: t("featuresComponent.verifiedProfilesDesc"),
    },
    {
      icon: Globe,
      title: t("featuresComponent.globalDiaspora"),
      description: t("featuresComponent.globalDiasporaDesc"),
    },
    {
      icon: Crown,
      title: t("featuresComponent.premiumExperience"),
      description: t("featuresComponent.premiumExperienceDesc"),
    },
    {
      icon: MessageCircle,
      title: t("featuresComponent.smartMessaging"),
      description: t("featuresComponent.smartMessagingDesc"),
    },
    {
      icon: Sparkles,
      title: t("featuresComponent.exclusiveEvents"),
      description: t("featuresComponent.exclusiveEventsDesc"),
    },
  ];
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("featuresComponent.title")}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("featuresComponent.tagline")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="p-8 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border bg-card animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                <feature.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
