import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ArrowLeft, Coins, Flame, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

const DAILY_REWARD = 5;
const STREAK_DAYS = 3;

interface StreakData {
  streak_count: number;
  streak_free_likes_credits: number;
  reward_earned: boolean;
  already_checked_in: boolean;
}

const DailyRewards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [freeReveals, setFreeReveals] = useState(0);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setWalletBalance(data?.balance || 0);
  }, [user]);

  const loadStreak = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("streak_count, streak_free_likes_credits")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      setStreakCount(data.streak_count ?? 0);
      setFreeReveals(data.streak_free_likes_credits ?? 0);
    }
  }, [user]);

  /** Check server-side whether the user already claimed today's reward. */
  const checkClaimedServer = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("item", "daily_reward")
      .gte("created_at", todayStart.toISOString())
      .limit(1)
      .maybeSingle();
    if (error) {
      logger.warn("Could not verify daily reward server-side, falling back to cache", error);
      const cached = localStorage.getItem(`daily_reward_${user.id}`);
      return cached === new Date().toDateString();
    }
    return data !== null;
  }, [user]);

  const handleClaim = async () => {
    if (!user) return;
    if (claimedToday) {
      toast.info(t("dailyRewards.toastAlreadyClaimed"));
      return;
    }

    setClaiming(true);
    try {
      // Re-verify server-side before crediting to prevent double-claims
      const alreadyClaimed = await checkClaimedServer();
      if (alreadyClaimed) {
        setClaimedToday(true);
        toast.info(t("dailyRewards.toastAlreadyClaimed"));
        return;
      }

      // Grant coins
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      const newBalance = (wallet?.balance || 0) + DAILY_REWARD;
      if (!wallet) {
        const { error: insertError } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, balance: DAILY_REWARD });
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (updateError) throw updateError;
      }
      setWalletBalance(newBalance);

      // Record transaction
      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({ user_id: user.id, amount: DAILY_REWARD, type: "grant", item: "daily_reward" });
      if (txError) throw txError;

      // Update streak via RPC
      const { data: streakResult, error: streakError } = (await supabase.rpc(
        "update_daily_streak",
        { p_user_id: user.id }
      )) as { data: StreakData | null; error: unknown };

      if (!streakError && streakResult) {
        setStreakCount(streakResult.streak_count);
        setFreeReveals(streakResult.streak_free_likes_credits);
        if (streakResult.reward_earned) {
          toast.success(t("dailyRewards.streakBonus"));
        } else {
          toast.success(t("dailyRewards.claimed", { coins: DAILY_REWARD }));
        }
      } else {
        toast.success(t("dailyRewards.claimed", { coins: DAILY_REWARD }));
      }

      localStorage.setItem(`daily_reward_${user.id}`, new Date().toDateString());
      setClaimedToday(true);
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
    Promise.all([loadWallet(), loadStreak(), checkClaimedServer()])
      .then(([, , claimed]) => setClaimedToday(claimed))
      .finally(() => setLoading(false));
  }, [user, navigate, loadWallet, loadStreak, checkClaimedServer]);

  // Determine which day cells are filled. streakCount is 0-6 after claiming;
  // when claimedToday, the displayed progress = streakCount (post-claim value from DB)
  const filledDays = claimedToday ? streakCount : streakCount;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("dailyRewards.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("dailyRewards.subtitle")}</p>
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
            {/* Wallet balance */}
            <Card className="p-4 rounded-2xl border-2 border-border bg-card/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dailyRewards.walletBalance")}</p>
                  <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <Coins className="h-5 w-5 text-primary" />
                    {walletBalance} {t("dailyRewards.coins")}
                  </div>
                </div>
                {freeReveals > 0 && (
                  <div
                    className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer"
                    onClick={() => navigate("/who-liked-you")}
                  >
                    <Eye className="h-4 w-4" />
                    {freeReveals} {t("dailyRewards.freeRevealsPlural", { count: freeReveals })}
                  </div>
                )}
              </div>
            </Card>

            {/* 3-day streak calendar */}
            <Card className="p-5 rounded-2xl border-2 border-border bg-card/80">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-foreground">
                  {t("dailyRewards.streakProgress", { current: Math.min(filledDays, STREAK_DAYS) })}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-5">
                {Array.from({ length: STREAK_DAYS }, (_, i) => {
                  const dayNum = i + 1;
                  const isFilled = dayNum <= filledDays;
                  const isDay3 = dayNum === STREAK_DAYS;
                  return (
                    <div
                      key={dayNum}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors ${
                        isFilled
                          ? "border-primary bg-primary/10"
                          : isDay3
                            ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                            : "border-border bg-muted/30"
                      }`}
                    >
                      <span className={`text-lg ${isFilled ? "opacity-100" : "opacity-30"}`}>
                        {isDay3 ? "🎁" : "🔥"}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isFilled
                            ? "text-primary"
                            : isDay3
                              ? "text-orange-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Day 7 reward description */}
              <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    {t("dailyRewards.day7Reward")}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-500">
                    {t("dailyRewards.day7Desc")}
                  </p>
                </div>
              </div>
            </Card>

            {/* Claim button */}
            <Card className="p-5 rounded-2xl border-2 border-border bg-card/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("dailyRewards.reward")}</span>
                <span className="text-lg font-semibold text-primary">
                  +{DAILY_REWARD} {t("dailyRewards.coins")}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleClaim}
                disabled={claimedToday || claiming}
              >
                {claimedToday
                  ? t("dailyRewards.claimedToday")
                  : claiming
                    ? t("dailyRewards.claiming")
                    : t("dailyRewards.claimButton", { coins: DAILY_REWARD })}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {t("dailyRewards.comeBack")}
              </p>
            </Card>

            {/* Free reveals CTA */}
            {freeReveals > 0 && (
              <Card
                className="p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => navigate("/who-liked-you")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("dailyRewards.revealCredits")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {freeReveals}{" "}
                        {freeReveals === 1
                          ? t("dailyRewards.freeReveals", { count: freeReveals })
                          : t("dailyRewards.freeRevealsPlural", { count: freeReveals })}
                      </p>
                    </div>
                  </div>
                  <span className="text-primary text-sm font-medium">
                    {t("dailyRewards.useReveal")}
                  </span>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default DailyRewards;
