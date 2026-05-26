import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("terms.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("terms.lastUpdated")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              {t("terms.back")}
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4 text-sm text-foreground">
          <p>{t("terms.p1")}</p>
          <p>{t("terms.p2")}</p>
          <p>{t("terms.p3")}</p>
          <p>{t("terms.p4")}</p>
          <p>{t("terms.p5")}</p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Terms;
