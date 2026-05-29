import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Search,
  Ban,
  ShieldCheck,
  UserX,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatHeaderProps {
  matchProfile: {
    full_name: string;
    profile_image_url: string | null;
  } | null;
  chatStreak: number;
  otherUserTyping: boolean;
  otherUserLastActive: string | null;
  blockedByYou: boolean;
  blockedYou: boolean;
  showMessageSearch: boolean;
  onBack: () => void;
  onProfileClick: () => void;
  onSearchToggle: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onUnmatch: () => void;
  onReport: () => void;
}

export function ChatHeader({
  matchProfile,
  chatStreak,
  otherUserTyping,
  otherUserLastActive,
  blockedByYou,
  blockedYou,
  showMessageSearch,
  onBack,
  onProfileClick,
  onSearchToggle,
  onVoiceCall,
  onVideoCall,
  onBlock,
  onUnblock,
  onUnmatch,
  onReport,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="rounded-2xl p-5 mb-6 glass-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-muted rounded-full"
              aria-label={t("chatHeader.backToMatches")}
            >
              <ArrowLeft className="h-5 w-5 text-primary/80" />
            </Button>
            <button
              type="button"
              className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              onClick={onProfileClick}
            >
              <div className="relative h-10 w-10">
                {matchProfile?.profile_image_url ? (
                  <img
                    src={matchProfile.profile_image_url}
                    alt={`${matchProfile.full_name}'s profile`}
                    loading="lazy"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center">
                    <span className="text-lg text-white">{matchProfile?.full_name[0]}</span>
                  </div>
                )}
                {blockedByYou && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <X className="h-8 w-8 text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {matchProfile?.full_name}
                  {chatStreak > 1 && (
                    <span
                      className="ml-2 text-sm font-normal text-orange-500"
                      title={`${chatStreak}-day streak`}
                    >
                      🔥 {chatStreak}
                    </span>
                  )}
                </h1>
                {otherUserTyping ? (
                  <p className="text-xs text-primary/30">{t("chat.typing")}</p>
                ) : otherUserLastActive ? (
                  <p className="text-xs text-muted-foreground">
                    {Date.now() - new Date(otherUserLastActive).getTime() < 5 * 60 * 1000
                      ? "🟢 Online"
                      : `Last seen ${new Date(otherUserLastActive).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}`}
                  </p>
                ) : null}
              </div>
            </button>
          </div>

          {/* Call Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchToggle}
              className="hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-full"
              aria-label={t("chatHeader.searchMessages")}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceCall}
              disabled={blockedByYou || blockedYou}
              className="hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-full"
              aria-label={t("chat.voiceCall")}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onVideoCall}
              disabled={blockedByYou || blockedYou}
              className="hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-full"
              aria-label={t("chat.videoCall")}
            >
              <Video className="h-5 w-5" />
            </Button>

            {/* Chat Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted text-muted-foreground rounded-full"
                  aria-label={t("chatHeader.chatMenu")}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {!blockedByYou ? (
                  <DropdownMenuItem
                    onClick={onBlock}
                    className="text-primary focus:text-primary focus:bg-primary/10"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Block user
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={onUnblock}
                    className="text-primary focus:text-primary focus:bg-primary/10"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Unblock user
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={onUnmatch}
                  className="text-primary focus:text-primary focus:bg-primary/10"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Unmatch
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onReport}
                  className="text-primary focus:text-primary focus:bg-primary/10"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
