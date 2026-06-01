import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, ArrowLeft, Flame, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface StreakState {
  streak: number;
  lastMessageDate: string | null;
  weekStart: string;
  messagesThisWeek: number;
}

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
};

const MatchGoals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [weeklyMessages, setWeeklyMessages] = useState(0);
  const [weeklyMatches, setWeeklyMatches] = useState(0);
  const [streak, setStreak] = useState(0);

  const streakState = useMemo(() => {
    if (!user) return null;
    const raw = localStorage.getItem(`match_streak_${user.id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StreakState;
    } catch {
      return null;
    }
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const weekStart = getWeekStart();
      const weekStartIso = new Date(weekStart).toISOString();

      const [messagesCount, matchesCount] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", user.id)
          .gte("created_at", weekStartIso),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .gte("created_at", weekStartIso),
      ]);

      if (messagesCount.error || matchesCount.error) {
        throw messagesCount.error || matchesCount.error;
      }

      setWeeklyMessages(messagesCount.count || 0);
      setWeeklyMatches(matchesCount.count || 0);
      setStreak(streakState?.streak || 0);
    } catch (error) {
      logger.error("Match goals load error", error);
      toast.error(t("matchGoals.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [user, streakState, t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const messageGoal = 25;
  const matchGoal = 3;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Target className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("matchGoals.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("matchGoals.subtitle")}</p>
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
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="h-4 w-4" />
                  {t("matchGoals.streak")}
                </div>
                <div className="text-3xl font-bold mt-2 text-foreground">
                  {streak} {t("matchGoals.days")}
                </div>
              </Card>
              <Card className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  {t("matchGoals.messagesThisWeek")}
                </div>
                <div className="text-3xl font-bold mt-2 text-foreground">{weeklyMessages}</div>
              </Card>
              <Card className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t("matchGoals.matchesThisWeek")}
                </div>
                <div className="text-3xl font-bold mt-2 text-foreground">{weeklyMatches}</div>
              </Card>
            </div>

            <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
              <h2 className="text-lg font-semibold">{t("matchGoals.weeklyGoals")}</h2>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("matchGoals.send")} {messageGoal} {t("matchGoals.messages")}
                </p>
                <progress
                  className="mt-2 w-full h-2 rounded-full overflow-hidden"
                  value={Math.min(messageGoal, weeklyMessages)}
                  max={messageGoal}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("matchGoals.get")} {matchGoal} {t("matchGoals.newMatches")}
                </p>
                <progress
                  className="mt-2 w-full h-2 rounded-full overflow-hidden"
                  value={Math.min(matchGoal, weeklyMatches)}
                  max={matchGoal}
                />
              </div>
            </Card>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MatchGoals;
