import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

const PremiumSuccess = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Check subscription status after payment
    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");

        if (error) throw error;

        if (data.subscribed) {
          toast.success(t("premiumSuccess.welcomePremium"));
        }
      } catch (error) {
        toast.error(t("premiumSuccess.errorVerifying"));
      }
    };
    checkSubscription();
  }, [t]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 text-center shadow-elegant">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">{t("premiumSuccess.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("premiumSuccess.subtitle")}</p>
        <div className="space-y-3 text-left mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>{t("premiumSuccess.unlimitedLikes")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>{t("premiumSuccess.seeWhoLikedYou")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>{t("premiumSuccess.advancedFilters")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>{t("premiumSuccess.priorityVisibility")}</span>
          </div>
        </div>
        <Button
          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
          onClick={() => navigate("/discover")}
        >
          {t("premiumSuccess.startDiscovering")}
        </Button>
      </Card>
    </div>
  );
};

export default PremiumSuccess;
