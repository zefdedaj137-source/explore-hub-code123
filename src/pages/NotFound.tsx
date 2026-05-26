import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Search } from "lucide-react";
import { useEffect } from "react";
import { analytics } from "@/lib/analytics";
import * as Sentry from "@sentry/react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    analytics.pageView(`/404?path=${location.pathname}`);
    Sentry.captureMessage(`404: ${location.pathname}`, "warning");
  }, [location.pathname]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-primary mb-2">{t("notFound.code")}</h1>
          <p className="text-2xl font-semibold mb-2">{t("notFound.heading")}</p>
          <p className="text-muted-foreground">
            {t("notFound.description")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/")}
            className="flex-1 bg-gradient-primary text-primary-foreground"
          >
            <Home className="h-4 w-4 mr-2" />
            {t("notFound.goHome")}
          </Button>
          <Button onClick={() => navigate("/discover")} variant="outline" className="flex-1">
            <Search className="h-4 w-4 mr-2" />
            {t("nav.discover")}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
