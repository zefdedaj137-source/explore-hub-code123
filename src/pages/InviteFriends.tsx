import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, ArrowLeft, Gift, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const InviteFriends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [invitesSent, setInvitesSent] = useState(0);

  const storageKey = useMemo(() => (user ? `invite_stats_${user.id}` : null), [user]);
  const codeKey = useMemo(() => (user ? `invite_code_${user.id}` : null), [user]);

  const inviteCode = useMemo(() => {
    if (!codeKey) return "";
    const existing = localStorage.getItem(codeKey);
    if (existing) return existing;
    const generated = user?.id ? user.id.replace(/-/g, "").slice(0, 8).toUpperCase() : "WELCOME";
    localStorage.setItem(codeKey, generated);
    return generated;
  }, [codeKey, user]);

  const inviteLink = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/invite?code=${inviteCode}`;
  }, [inviteCode]);

  const loadStats = useCallback(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { invitesSent?: number };
      if (parsed?.invitesSent) setInvitesSent(parsed.invitesSent);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveStats = useCallback(
    (count: number) => {
      if (!storageKey) return;
      localStorage.setItem(storageKey, JSON.stringify({ invitesSent: count }));
    },
    [storageKey]
  );

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadStats();
  }, [user, navigate, loadStats]);

  const handleShare = async () => {
    const payload = {
      title: "Join me on Explore Hub",
      text: "Let’s match on Explore Hub! Use my invite code for bonus coins.",
      url: inviteLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
        toast.success(t("inviteFriends.linkCopied"));
      } else {
        toast.info(t("inviteFriends.copyManually"));
      }
      const nextCount = invitesSent + 1;
      setInvitesSent(nextCount);
      saveStats(nextCount);

      // Award 3 coins on the very first share
      if (invitesSent === 0 && user) {
        try {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();
          const currentBalance = (wallet as { balance: number } | null)?.balance ?? 0;
          await supabase
            .from("wallets")
            .upsert({ user_id: user.id, balance: currentBalance + 3, updated_at: new Date().toISOString() });
          await supabase
            .from("wallet_transactions")
            .insert({ user_id: user.id, amount: 3, type: "earn", item: "invite_reward" });
          toast.success(t("inviteFriends.rewardCoins", "🎁 You earned 3 coins for sharing!"));
        } catch (e) {
          logger.error("Failed to credit invite reward", e);
        }
      }
    } catch (error) {
      logger.error("Share failed", error);
      toast.error(t("inviteFriends.shareError"));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(t("inviteFriends.linkCopied"));
    } catch (error) {
      logger.error("Copy failed", error);
      toast.error(t("inviteFriends.copyError"));
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Share2 className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("inviteFriends.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("inviteFriends.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t("inviteFriends.yourCode")}</h2>
              <p className="text-sm text-muted-foreground">{t("inviteFriends.shareCodeDesc")}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-border">
            <div>
              <p className="text-xs text-primary uppercase">{t("inviteFriends.inviteCode")}</p>
              <p className="text-xl font-bold tracking-widest text-primary">{inviteCode}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              {t("inviteFriends.copy")}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {t("inviteFriends.invitesSent")}: <span className="font-semibold text-foreground">{invitesSent}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Button className="w-full" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t("inviteFriends.shareInvite")}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleCopy}>
              {t("inviteFriends.copyInviteLink")}
            </Button>
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default InviteFriends;
