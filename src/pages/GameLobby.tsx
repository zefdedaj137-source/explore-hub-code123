import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gamepad2, Users, Trophy, Sparkles, Send, Music, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OnlinePlayer {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  city?: string;
  status: 'available' | 'in-game' | 'invited';
}

interface GameInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  game_mode?: 'history' | 'music' | 'dance';
  created_at: string;
  from_user: {
    full_name: string;
    profile_image_url: string | null;
  };
}

const GameLobby = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [showGameModeDialog, setShowGameModeDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchOnlinePlayers();
      listenForInvites();
      updateUserStatus('available');
      
      // Refresh online players every 10 seconds
      const interval = setInterval(fetchOnlinePlayers, 10000);
      
      return () => {
        clearInterval(interval);
        updateUserStatus('offline');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateUserStatus = async (status: string) => {
    if (!user) return;
    
    try {
      // Use any to bypass TypeScript until types are regenerated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('profiles')
        .update({ 
          game_status: status,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const fetchOnlinePlayers = async () => {
    if (!user) return;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Use any to bypass TypeScript until types are regenerated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: players, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, age, profile_image_url, city, game_status, last_seen')
        .neq('id', user.id)
        .gte('last_seen', fiveMinutesAgo)
        .in('game_status', ['available', 'in-game']);

      if (error) throw error;

      if (players) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOnlinePlayers(players.map((p: any) => ({
          ...p,
          status: (p.game_status as 'available' | 'in-game') || 'available'
        })));
      }
    } catch (error) {
      console.error('Error fetching online players:', error);
    } finally {
      setLoading(false);
    }
  };

  const listenForInvites = () => {
    if (!user) return;

    // Listen for incoming invites (when someone invites you)
    const incomingChannel = supabase
      .channel('game-invites-incoming')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invites',
          filter: `to_user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('📨 Invite received:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            // Fetch full invite details
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
              .from('game_invites')
              .select(`
                id,
                from_user_id,
                to_user_id,
                status,
                game_mode,
                created_at,
                from_user:profiles!game_invites_from_user_id_fkey(full_name, profile_image_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setPendingInvites(prev => [...prev, data]);
              toast.info(`${data.from_user.full_name} invited you to play!`, {
                duration: 5000
              });
            }
          }
        }
      )
      .subscribe();

    // Listen for outgoing invites being accepted (when someone accepts your invite)
    const outgoingChannel = supabase
      .channel('game-invites-outgoing')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_invites',
          filter: `from_user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('✅ Invite status updated:', payload);
          
          if (payload.new.status === 'accepted') {
            const gameMode = payload.new.game_mode || 'history';
            const sessionId = payload.new.id;
            const modeEmoji = gameMode === 'history' ? '🏛️' : gameMode === 'music' ? '🎵' : '💃';
            
            console.log(`🎮 SENDER: Navigating to ${gameMode} session:`, sessionId);
            toast.success(`${modeEmoji} Challenge accepted! Starting game...`);
            
            // Update status before navigating
            await updateUserStatus('in-game');
            
            // Navigate to correct game session based on mode
            const routeMap = {
              history: `/game-session/${sessionId}`,
              music: `/game-session-music/${sessionId}`,
              dance: `/game-session-dance/${sessionId}`
            };
            navigate(routeMap[gameMode]);
          }
        }
      )
      .subscribe();

    return () => {
      incomingChannel.unsubscribe();
      outgoingChannel.unsubscribe();
    };
  };

  const openGameModeDialog = (toUserId: string, playerName: string) => {
    setSelectedPlayer({ id: toUserId, name: playerName });
    setShowGameModeDialog(true);
  };

  const sendInvite = async (gameMode: 'history' | 'music' | 'dance') => {
    if (!user || !selectedPlayer) return;

    try {
      // Check if invite already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('game_invites')
        .select('id')
        .eq('from_user_id', user.id)
        .eq('to_user_id', selectedPlayer.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.info("You already sent an invite to this player");
        setShowGameModeDialog(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('game_invites')
        .insert({
          from_user_id: user.id,
          to_user_id: selectedPlayer.id,
          status: 'pending',
          game_mode: gameMode
        })
        .select()
        .single();

      if (error) throw error;

      setSentInvites(prev => new Set([...prev, selectedPlayer.id]));
      toast.success(`${gameMode === 'history' ? '🏛️ History' : gameMode === 'music' ? '🎵 Music' : '💃 Dance'} challenge sent to ${selectedPlayer.name}!`);
      setShowGameModeDialog(false);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error("Failed to send invite");
    }
  };

  const handleAcceptInvite = async (invite: GameInvite) => {
    try {
      console.log(`🎮 RECEIVER: Accepting invite ${invite.id} for ${invite.game_mode} game`);
      
      // Update invite status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('game_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      if (error) throw error;

      // Update both users' game status
      await updateUserStatus('in-game');
      
      const gameMode = invite.game_mode || 'history';
      const modeEmoji = gameMode === 'history' ? '🏛️' : gameMode === 'music' ? '🎵' : '💃';
      
      console.log(`🎮 RECEIVER: Navigating to ${gameMode} session:`, invite.id);
      toast.success(`${modeEmoji} Challenge accepted! Starting game...`);
      
      // Navigate to correct game session based on mode
      const routeMap = {
        history: `/game-session/${invite.id}`,
        music: `/game-session-music/${invite.id}`,
        dance: `/game-session-dance/${invite.id}`
      };
      navigate(routeMap[gameMode]);
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast.error("Failed to accept invite");
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('game_invites')
        .update({ status: 'declined' })
        .eq('id', inviteId);

      setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      toast.info("Invite declined");
    } catch (error) {
      console.error('Error declining invite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading game lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-subtle/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-pink-500" />
              <h1 className="text-xl font-bold">Game Lobby</h1>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              Online
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-gray-800">Pending Challenges</h2>
            </div>
            
            {pendingInvites.map(invite => {
              const gameMode = invite.game_mode || 'history';
              const modeInfo = {
                history: { emoji: '🏛️', name: 'History Lovers', color: 'from-pink-50 to-purple-50' },
                music: { emoji: '🎵', name: 'Music Lovers', color: 'from-purple-50 to-pink-50' },
                dance: { emoji: '💃', name: 'Dance Challenge', color: 'from-orange-50 to-yellow-50' }
              };
              const mode = modeInfo[gameMode];
              
              return (
                <Card key={invite.id} className={`p-4 bg-gradient-to-r ${mode.color} border-2 border-yellow-300 shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-yellow-400">
                        <AvatarImage src={invite.from_user.profile_image_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                          {invite.from_user.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {invite.from_user.full_name} challenges you!
                        </p>
                        <p className="text-sm text-gray-600">{mode.emoji} {mode.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptInvite(invite)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeclineInvite(invite.id)}
                        className="border-red-300 hover:bg-red-50"
                      >
                        Decline
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
              <Users className="h-5 w-5 text-pink-500" />
              <h2 className="text-lg font-bold text-gray-800">Online Players</h2>
              <Badge variant="outline" className="text-pink-600">
                {onlinePlayers.length} online
              </Badge>
            </div>
          </div>

          {onlinePlayers.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-700">No Players Online</h3>
              <p className="text-gray-600 mb-4">Be the first one here! Other players will join soon.</p>
              <p className="text-sm text-gray-500">This list updates automatically every 10 seconds</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {onlinePlayers.map(player => (
                <Card key={player.id} className="p-4 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-14 w-14 border-2 border-pink-300">
                        <AvatarImage src={player.profile_image_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white text-lg">
                          {player.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">
                            {player.full_name}, {player.age}
                          </h3>
                          {player.status === 'available' ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                              Available
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                              In Game
                            </Badge>
                          )}
                        </div>
                        {player.city && (
                          <p className="text-sm text-gray-600">📍 {player.city}</p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => openGameModeDialog(player.id, player.full_name)}
                      disabled={player.status === 'in-game' || sentInvites.has(player.id)}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
                    >
                      {sentInvites.has(player.id) ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Invited
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Challenge
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
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Send invites to players you want to play with</li>
                <li>• Accept challenges from others to start a game</li>
                <li>• Play Albanian Trivia together in real-time</li>
                <li>• After the game, like or pass based on their smartness</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Game Mode Selection Dialog */}
      <Dialog open={showGameModeDialog} onOpenChange={setShowGameModeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Choose Your Game! 🎮</DialogTitle>
            <DialogDescription className="text-center">
              Pick a game mode to challenge {selectedPlayer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* History Lovers */}
            <Button
              onClick={() => sendInvite('history')}
              className="h-auto py-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  <span className="text-xl font-bold">History Lovers</span>
                </div>
                <span className="text-sm opacity-90">🏛️ Albanian History & Culture Trivia</span>
              </div>
            </Button>

            {/* Music Lovers */}
            <Button
              onClick={() => sendInvite('music')}
              className="h-auto py-6 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                  <Music className="h-6 w-6" />
                  <span className="text-xl font-bold">Music Lovers</span>
                </div>
                <span className="text-sm opacity-90">🎵 Albanian Music & Artists Trivia</span>
              </div>
            </Button>

            {/* Dance Challenge */}
            <Button
              onClick={() => sendInvite('dance')}
              className="h-auto py-6 bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700"
            >
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-6 w-6" />
                  <span className="text-xl font-bold">Dance Challenge</span>
                </div>
                <span className="text-sm opacity-90">💃 Valle & Albanian Dance Trivia</span>
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
