import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ArrowLeft, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

const DAILY_REWARD = 5;

const DailyRewards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);

  const claimKey = useMemo(() => (user ? `daily_reward_${user.id}` : null), [user]);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setWalletBalance(data?.balance || 0);
  }, [user]);

  const checkClaimed = useCallback(() => {
    if (!claimKey) return false;
    const lastClaim = localStorage.getItem(claimKey);
    if (!lastClaim) return false;
    const today = new Date().toDateString();
    return lastClaim === today;
  }, [claimKey]);

  const handleClaim = async () => {
    if (!user) return;
    if (claimedToday) {
      toast.info(t("dailyRewards.toastAlreadyClaimed"));
      return;
    }

    setClaiming(true);
    try {
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (!wallet) {
        const { error: insertError } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, balance: DAILY_REWARD });
        if (insertError) throw insertError;
        setWalletBalance(DAILY_REWARD);
      } else {
        const newBalance = (wallet.balance || 0) + DAILY_REWARD;
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (updateError) throw updateError;
        setWalletBalance(newBalance);
      }

      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({ user_id: user.id, amount: DAILY_REWARD, type: "grant", item: "daily_reward" });
      if (txError) throw txError;

      if (claimKey) {
        localStorage.setItem(claimKey, new Date().toDateString());
      }
      setClaimedToday(true);
      toast.success(t("dailyRewards.claimed", { coins: DAILY_REWARD }));
    } catch (error) {
      logger.error("Daily reward claim failed", error);
      toast.error(t("dailyRewards.toastFailed"));
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    loadWallet().finally(() => {
      setClaimedToday(checkClaimed());
      setLoading(false);
    });
  }, [user, navigate, loadWallet, checkClaimed]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("dailyRewards.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("dailyRewards.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">{t("common.loading")}</Card>
        ) : (
          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dailyRewards.walletBalance")}</p>
                <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                  <Coins className="h-5 w-5 text-primary" />
                  {walletBalance} {t("dailyRewards.coins")}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-primary">{t("dailyRewards.reward")}</p>
                <p className="text-lg font-semibold text-primary">+{DAILY_REWARD} coins</p>
              </div>
            </div>

            <Button className="w-full" onClick={handleClaim} disabled={claimedToday || claiming}>
              {claimedToday ? t("dailyRewards.claimedToday") : claiming ? t("dailyRewards.claiming") : t("dailyRewards.claimButton")}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t("dailyRewards.comeBack")}
            </p>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default DailyRewards;
