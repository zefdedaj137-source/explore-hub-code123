import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Gamepad2,
  Users,
  Trophy,
  Sparkles,
  Send,
  Music,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface OnlinePlayer {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  city?: string;
  status: "available" | "in-game" | "invited";
}

interface GameInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  game_mode?: "history" | "music" | "dance";
  created_at: string;
  from_user: {
    full_name: string;
    profile_image_url: string | null;
  };
}

const GameLobby = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [showGameModeDialog, setShowGameModeDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (user) {
      setSentInvites(new Set()); // reset on mount so re-entering lobby clears stale UI state
      fetchOnlinePlayers();
      const cleanupInvites = listenForInvites();
      updateUserStatus("available");

      // Refresh online players every 10 seconds
      const interval = setInterval(fetchOnlinePlayers, 10000);

      return () => {
        clearInterval(interval);
        cleanupInvites?.();
        void updateUserStatus("offline").catch(() => {});
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function updateUserStatus(status: string) {
    if (!user) return;

    try {
      await supabase
        .from("profiles")
        .update({
          game_status: status,
          last_seen: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch (error) {
      logger.error("Error updating status:", error);
    }
  }

  async function fetchOnlinePlayers() {
    if (!user) return;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Fetch current user's matches so we can exclude them from the lobby
      const { data: matchRows } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const matchedIds = new Set(
        (matchRows ?? []).map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id))
      );

      const { data: players, error } = await supabase
        .from("profiles")
        .select("id, full_name, age, profile_image_url, city, game_status, last_seen")
        .neq("id", user.id)
        .gte("last_seen", fiveMinutesAgo)
        .in("game_status", ["available", "in-game"]);

      if (error) throw error;

      if (players) {
        setOnlinePlayers(
          players
            .filter((p) => !matchedIds.has(p.id))
            .map((p) => ({
              ...p,
              city: p.city ?? undefined,
              status: (p.game_status as "available" | "in-game") || "available",
            }))
        );
      }
    } catch (error) {
      logger.error("Error fetching online players:", error);
    } finally {
      setLoading(false);
    }
  }

  function listenForInvites() {
    if (!user) return;

    // Listen for incoming invites (when someone invites you)
    const incomingChannel = supabase
      .channel("game-invites-incoming")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_invites",
          filter: `to_user_id=eq.${user.id}`,
        },
        async (payload) => {
          logger.log("🎮 Invite received:", payload);

          if (payload.eventType === "INSERT" && payload.new.status === "pending") {
            // Fetch full invite details
            const { data } = await supabase
              .from("game_invites")
              .select(
                `
                id,
                from_user_id,
                to_user_id,
                status,
                game_mode,
                created_at,
                from_user:profiles!game_invites_from_user_id_fkey(full_name, profile_image_url)
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setPendingInvites((prev) => [...prev, data as GameInvite]);
              toast.info(t("gameLobby.inviteReceived"), {
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    // Listen for outgoing invites being accepted (when someone accepts your invite)
    const outgoingChannel = supabase
      .channel("game-invites-outgoing")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_invites",
          filter: `from_user_id=eq.${user.id}`,
        },
        async (payload) => {
          logger.log("🔄 Invite status updated:", payload);

          if (payload.new.status === "accepted") {
            const gameMode = payload.new.game_mode || "history";
            const sessionId = payload.new.id;
            const modeEmoji = gameMode === "history" ? "📜" : gameMode === "music" ? "🎵" : "💃";

            logger.log(`🚀 SENDER: Navigating to ${gameMode} session:`, sessionId);
            toast.success(`${modeEmoji} ${t("gameLobby.challengeAccepted")}`);

            // Update status before navigating
            await updateUserStatus("in-game");

            // Navigate to correct game session based on mode
            const routeMap = {
              history: `/game-session/${sessionId}`,
              music: `/game-session-music/${sessionId}`,
              dance: `/game-session-dance/${sessionId}`,
            };
            navigate(routeMap[gameMode as keyof typeof routeMap]);
          }
        }
      )
      .subscribe();

    return () => {
      incomingChannel.unsubscribe();
      outgoingChannel.unsubscribe();
    };
  }

  const openGameModeDialog = (toUserId: string, playerName: string) => {
    setSelectedPlayer({ id: toUserId, name: playerName });
    setShowGameModeDialog(true);
  };

  const sendInvite = async (gameMode: "history" | "music" | "dance") => {
    if (!user || !selectedPlayer) return;

    try {
      // Guard: prevent sending an invite to a matched user
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${selectedPlayer.id}),and(user1_id.eq.${selectedPlayer.id},user2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existingMatch) {
        toast.error(t("gameLobby.cannotPlayMatched"));
        setShowGameModeDialog(false);
        setSelectedPlayer(null);
        return;
      }
      // Remove any stale pending invite before sending a new one
      await supabase
        .from("game_invites")
        .delete()
        .eq("from_user_id", user.id)
        .eq("to_user_id", selectedPlayer.id)
        .eq("status", "pending");

      const { error } = await supabase
        .from("game_invites")
        .insert({
          from_user_id: user.id,
          to_user_id: selectedPlayer.id,
          status: "pending",
          game_mode: gameMode,
        })
        .select()
        .single();

      if (error) throw error;

      setSentInvites((prev) => new Set([...prev, selectedPlayer.id]));
      const modeName =
        gameMode === "history" ? "📜 History" : gameMode === "music" ? "🎵 Music" : "💃 Dance";
      toast.success(t("gameLobby.inviteSent", { mode: modeName, name: selectedPlayer.name }));
      setShowGameModeDialog(false);
      setSelectedPlayer(null);
    } catch (error) {
      logger.error("Error sending invite:", error);
      toast.error(t("gameLobby.failedInvite"));
    }
  };

  const handleAcceptInvite = async (invite: GameInvite) => {
    try {
      logger.log(`🎯 RECEIVER: Accepting invite ${invite.id} for ${invite.game_mode} game`);

      // Update invite status
      const { error } = await supabase
        .from("game_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      if (error) throw error;

      // Update both users' game status
      await updateUserStatus("in-game");

      const gameMode = invite.game_mode || "history";
      const modeEmoji = gameMode === "history" ? "📜" : gameMode === "music" ? "🎵" : "💃";

      logger.log(`🚀 RECEIVER: Navigating to ${gameMode} session:`, invite.id);
      toast.success(`${modeEmoji} ${t("gameLobby.challengeAccepted")}`);

      // Navigate to correct game session based on mode
      const routeMap = {
        history: `/game-session/${invite.id}`,
        music: `/game-session-music/${invite.id}`,
        dance: `/game-session-dance/${invite.id}`,
      };
      navigate(routeMap[gameMode]);
    } catch (error) {
      logger.error("Error accepting invite:", error);
      toast.error(t("gameLobby.failedAccept"));
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await supabase.from("game_invites").update({ status: "declined" }).eq("id", inviteId);

      setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      toast.info(t("gameLobby.inviteDeclined"));
    } catch (error) {
      logger.error("Error declining invite:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("gameLobby.loadingLobby")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-subtle pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-subtle/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("common.goBack")}
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">{t("gameLobby.title")}</h1>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              {t("gameLobby.online")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                {t("gameLobby.pendingChallenges")}
              </h2>
            </div>

            {pendingInvites.map((invite) => {
              const gameMode = invite.game_mode || "history";
              const modeInfo = {
                history: {
                  emoji: "📜",
                  name: "History Lovers",
                  color: "from-background to-muted",
                },
                music: {
                  emoji: "🎵",
                  name: "Music Lovers",
                  color: "from-primary/10 to-primary/10",
                },
                dance: {
                  emoji: "💃",
                  name: "Dance Challenge",
                  color: "from-orange-50 to-yellow-50",
                },
              };
              const mode = modeInfo[gameMode];

              return (
                <Card
                  key={invite.id}
                  className={`p-4 bg-gradient-to-r ${mode.color} border-2 border-yellow-300 shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-yellow-400 blur-md">
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary/80 text-white">
                          ?
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">
                          {t("gameLobby.anonymousChallenge")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mode.emoji} {mode.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptInvite(invite)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        {t("gameLobby.accept")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeclineInvite(invite.id)}
                        className="border-red-300 hover:bg-red-50"
                      >
                        {t("gameLobby.decline")}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Online Players Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">{t("gameLobby.onlinePlayers")}</h2>
              <Badge variant="outline" className="text-primary">
                {t("gameLobby.onlineCount", { count: onlinePlayers.length })}
              </Badge>
            </div>
          </div>

          {onlinePlayers.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-foreground">
                {t("gameLobby.noPlayersTitle")}
              </h3>
              <p className="text-muted-foreground mb-4">{t("gameLobby.noPlayersDesc")}</p>
              <p className="text-sm text-muted-foreground">{t("gameLobby.autoUpdates")}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {onlinePlayers.map((player) => (
                <Card key={player.id} className="p-4 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-14 w-14 border-2 border-border blur-md">
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary/80 text-white text-lg">
                          ?
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {t("gameLobby.anonymousPlayer")}
                          </h3>
                          {player.status === "available" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                              {t("gameLobby.available")}
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                              {t("gameLobby.inGame")}
                            </Badge>
                          )}
                        </div>
                        {player.city && (
                          <p className="text-sm text-muted-foreground">📍 {player.city}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => openGameModeDialog(player.id, player.full_name)}
                      disabled={player.status === "in-game" || sentInvites.has(player.id)}
                      className="disabled:opacity-50"
                    >
                      {sentInvites.has(player.id) ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          {t("gameLobby.invited")}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          {t("gameLobby.challenge")}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/10 border-border">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t("gameLobby.howItWorks")}</h3>
              <ul className="text-sm text-foreground space-y-1">
                <li>✨ {t("gameLobby.tip1")}</li>
                <li>✨ {t("gameLobby.tip2")}</li>
                <li>✨ {t("gameLobby.tip3")}</li>
                <li>✨ {t("gameLobby.tip4")}</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Game Mode Selection Dialog */}
      <Dialog open={showGameModeDialog} onOpenChange={setShowGameModeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {t("gameLobby.chooseGame")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("gameLobby.pickMode", { name: selectedPlayer?.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* History Lovers */}
            <Button
              onClick={() => sendInvite("history")}
              className="h-auto py-6 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700"
            >
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  <span className="text-xl font-bold">{t("gameLobby.historyLovers")}</span>
                </div>
                <span className="text-sm opacity-90">{t("gameLobby.historyDesc")}</span>
              </div>
            </Button>

            {/* Music Lovers */}
            <Button
              onClick={() => sendInvite("music")}
              className="h-auto py-6 bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary"
            >
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                  <Music className="h-6 w-6" />
                  <span className="text-xl font-bold">{t("gameLobby.musicLovers")}</span>
                </div>
                <span className="text-sm opacity-90">{t("gameLobby.musicDesc")}</span>
              </div>
            </Button>

            {/* Dance Challenge */}
            <Button
              onClick={() => sendInvite("dance")}
              className="h-auto py-6 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
            >
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-6 w-6" />
                  <span className="text-xl font-bold">{t("gameLobby.danceChallenge")}</span>
                </div>
                <span className="text-sm opacity-90">{t("gameLobby.danceDesc")}</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default GameLobby;
