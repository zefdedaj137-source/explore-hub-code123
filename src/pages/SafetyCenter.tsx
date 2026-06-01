import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, PhoneCall, FileText, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

const SafetyCenter = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("safetyCenter.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("safetyCenter.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              {t("common.back")}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              {t("safetyCenter.reportAndBlock")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("safetyCenter.reportBlockDesc")}
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => navigate("/settings")}>
                {t("safetyCenter.openSafetySettings")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/discover")}>
                {t("nav.discover")}
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t("safetyCenter.meetSafely")}
            </h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc ml-5">
              <li>{t("safetyCenter.meetInPublic")}</li>
              <li>{t("safetyCenter.videoBeforeMeeting")}</li>
              <li>{t("safetyCenter.trustInstincts")}</li>
            </ul>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-primary" />
              {t("safetyCenter.emergencyHelp")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("safetyCenter.emergencyMessage")}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open("https://www.112.eu/", "_blank", "noopener,noreferrer")}
            >
              {t("safetyCenter.findEmergencyNumbers")}
            </Button>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("safetyCenter.policies")}
            </h2>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/terms")}>
                {t("safetyCenter.terms")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/privacy")}>
                {t("safetyCenter.privacy")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SafetyCenter;
