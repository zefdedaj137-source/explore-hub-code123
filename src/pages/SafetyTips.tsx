import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Phone, MapPin, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

const SafetyTips = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("safetyTips.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("safetyTips.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">{t("safetyTips.meetInPublic")}</h2>
                <p className="text-sm text-muted-foreground">{t("safetyTips.meetInPublicDesc")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">{t("safetyTips.keepChatsInApp")}</h2>
                <p className="text-sm text-muted-foreground">{t("safetyTips.keepChatsDesc")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <Phone className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">{t("safetyTips.sharePlans")}</h2>
                <p className="text-sm text-muted-foreground">{t("safetyTips.sharePlansDesc")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">{t("safetyTips.reportSuspicious")}</h2>
                <p className="text-sm text-muted-foreground">{t("safetyTips.reportSuspiciousDesc")}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default SafetyTips;
