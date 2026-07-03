import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ghost, Bell, Clock, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface GhostAlert {
  matchId: string;
  partnerName: string;
  partnerImage: string | null;
  lastMessageAt: string;
  hoursSinceReply: number;
  nudgeSent: boolean;
}

const GhostModeAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [alerts, setAlerts] = useState<GhostAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const stored = localStorage.getItem(`ghost_settings_${user.id}`);
      if (stored) setEnabled(JSON.parse(stored).enabled);

      const { data: matches } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const ghostAlerts: GhostAlert[] = [];
      for (const match of matches || []) {
        const partnerId = match.user1_id === user.id ? match.user2_id : match.user1_id;

        const [{ data: profile }, { data: lastMsg }] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, profile_image_url")
            .eq("id", partnerId)
            .single(),
          supabase
            .from("messages")
            .select("created_at, sender_id")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (lastMsg) {
          const hours = (Date.now() - new Date(lastMsg.created_at).getTime()) / 3600000;
          if (hours >= 48 && lastMsg.sender_id === user.id) {
            const nudges = JSON.parse(
              localStorage.getItem(`nudges_${user.id}`) || "[]"
            ) as string[];
            ghostAlerts.push({
              matchId: match.id,
              partnerName: profile?.full_name || "Unknown",
              partnerImage: profile?.profile_image_url || null,
              lastMessageAt: lastMsg.created_at,
              hoursSinceReply: Math.floor(hours),
              nudgeSent: nudges.includes(match.id),
            });
          }
        }
      }

      setAlerts(ghostAlerts.sort((a, b) => b.hoursSinceReply - a.hoursSinceReply));
    } catch (e) {
      logger.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const toggleEnabled = () => {
    if (!user) return;
    const newVal = !enabled;
    setEnabled(newVal);
    localStorage.setItem(`ghost_settings_${user.id}`, JSON.stringify({ enabled: newVal }));
    toast.success(newVal ? t("ghostAlerts.alertsOn") : t("ghostAlerts.alertsOff"));
  };

  const sendNudge = async (matchId: string, partnerName: string) => {
    if (!user) return;
    try {
      await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: user.id,
        content: `Hey ${partnerName}! ?? Just checking in � hope you're doing well!`,
      });
      const nudges = JSON.parse(localStorage.getItem(`nudges_${user.id}`) || "[]") as string[];
      nudges.push(matchId);
      localStorage.setItem(`nudges_${user.id}`, JSON.stringify(nudges));
      setAlerts((prev) => prev.map((a) => (a.matchId === matchId ? { ...a, nudgeSent: true } : a)));
      toast.success(t("ghostAlerts.nudgeSent", { name: partnerName }));
    } catch {
      toast.error(t("ghostAlerts.failedNudge"));
    }
  };

  const formatTime = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-background to-slate-50 pb-24">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Ghost className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-bold">{t("ghostAlerts.title")}</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{t("ghostAlerts.heading")}</h2>
            <p className="text-sm text-muted-foreground">{t("ghostAlerts.subtitle")}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("ghostAlerts.checking")}</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <Ghost className="h-16 w-16 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">{t("ghostAlerts.noGhosting")}</h3>
            <p className="text-muted-foreground text-sm">{t("ghostAlerts.allResponsive")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">
              {t("ghostAlerts.waitingReplies", { count: alerts.length })}
            </h2>
            {alerts.map((a) => (
              <Card key={a.matchId} className="p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={a.partnerImage || "/placeholder.svg"}
                    alt={a.partnerName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{a.partnerName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> {formatTime(a.hoursSinceReply)} ago
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {a.nudgeSent ? (
                      <Badge className="bg-green-100 text-green-700">
                        {t("ghostAlerts.nudged")}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => sendNudge(a.matchId, a.partnerName)}
                        className="bg-primary hover:bg-primary text-white"
                      >
                        <Send className="h-3 w-3 mr-1" /> {t("ghostAlerts.nudge")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/chat/${a.matchId}`)}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" /> {t("ghostAlerts.chat")}
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

export default GhostModeAlert;
