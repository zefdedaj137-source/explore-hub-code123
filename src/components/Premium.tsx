import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const Premium = () => {
  const { t } = useTranslation();

  const premiumFeatures = [
    t("premium.unlimitedLikes"),
    t("premium.seeWhoLiked"),
    t("premium.advancedFilters"),
    t("premium.spotlightBooster"),
    t("premium.viewBoosted"),
    t("premium.priorityVisibility"),
    t("premium.datingGamesAccess"),
    t("premium.noAds"),
  ];
  return (
    <section id="premium" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 shadow-elegant border-accent/20 bg-gradient-to-br from-card to-accent/5">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-gold mb-6">
                <Crown className="h-5 w-5 text-accent-foreground" />
                <span className="text-sm font-semibold text-accent-foreground">
                  {t("premium.membership")}
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t("premium.unlockFeatures")}
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t("premium.description")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {premiumFeatures.map((feature, index) => {
                const delayClass = `delay-${Math.min(index * 50, 300)}`;
                return (
                  <div
                    key={feature}
                    className={`flex items-start gap-3 animate-slide-up ${delayClass}`}
                  >
                    <div className="h-6 w-6 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </div>
                );
              })}
            </div>

            <div className="text-center space-y-4">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-foreground">{t("premium.price")}</span>
                <span className="text-muted-foreground">{t("premium.priceInterval")}</span>
              </div>

              <Button
                size="lg"
                className="bg-gradient-gold text-accent-foreground hover:opacity-90 transition-opacity shadow-elegant text-lg px-12"
                onClick={() => (window.location.href = "/auth")}
              >
                <Crown className="h-5 w-5 mr-2" />
                {t("premium.upgrade")}
              </Button>

              <p className="text-sm text-muted-foreground">{t("premium.cancelAnytime")}</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Premium;
