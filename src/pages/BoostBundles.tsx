import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowLeft, Coins, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

const bundles = [
  { hours: 3, cost: 45, label: "Starter", savings: "Save 10%" },
  { hours: 6, cost: 80, label: "Popular", savings: "Save 15%" },
  { hours: 12, cost: 140, label: "Power", savings: "Save 20%" },
];

const BoostBundles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [processing, setProcessing] = useState<number | null>(null);

  const offerEndsAt = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() + 6);
    return date;
  }, []);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setWalletBalance(data?.balance || 0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    loadWallet().finally(() => setLoading(false));
  }, [user, navigate, loadWallet]);

  const handlePurchase = async (hours: number, cost: number) => {
    if (!user) return;
    if (walletBalance < cost) {
      toast.error(t("boostBundles.notEnoughCoins"));
      return;
    }

    setProcessing(hours);
    try {
      const { error } = await supabase.rpc("activate_booster", {
        user_id: user.id,
        hours,
      });
      if (error) throw error;

      const newBalance = walletBalance - cost;
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (walletError) throw walletError;

      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({ user_id: user.id, amount: -cost, type: "spend", item: `boost_${hours}h_bundle` });
      if (txError) throw txError;

      setWalletBalance(newBalance);
      toast.success(t("boostBundles.activated", { hours }));
    } catch (error) {
      logger.error("Boost purchase error", error);
      toast.error(t("boostBundles.failedActivate"));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("boostBundles.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("boostBundles.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">
            {t("common.loading")}
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 rounded-2xl border-2 border-border bg-card/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4" />
                {t("boostBundles.walletBalance")}
              </div>
              <div className="text-xl font-bold text-foreground">
                {walletBalance} {t("boostBundles.coins")}
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border-2 border-border bg-card/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                {t("boostBundles.offerEnds")}
              </div>
              <div className="text-sm font-semibold text-primary">
                {offerEndsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
            </Card>

            {bundles.map((bundle) => (
              <Card
                key={bundle.hours}
                className="p-5 rounded-2xl border-2 border-border bg-card/80"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{bundle.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {bundle.hours} {t("boostBundles.hoursBoost")}
                    </p>
                    <p className="text-xs text-primary mt-1">{bundle.savings}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {bundle.cost} {t("boostBundles.coins")}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => handlePurchase(bundle.hours, bundle.cost)}
                      disabled={processing === bundle.hours}
                    >
                      {processing === bundle.hours
                        ? t("boostBundles.processing")
                        : t("boostBundles.activate")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default BoostBundles;
