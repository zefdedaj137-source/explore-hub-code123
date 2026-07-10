import { Card } from "@/components/ui/card";
import { Mic, Trash2, Reply } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  voice_url?: string;
  image_url?: string;
  read_at?: string | null;
  reply_to_id?: string | null;
  deleted_at?: string | null;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  matchName?: string;
  supportsReadReceipts: boolean;
  reactions: { emoji: string; user_id: string }[];
  reactionPickerMsgId: string | null;
  reactionEmojis: string[];
  replySource?: Message | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onToggleReactionPicker: (messageId: string) => void;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  matchName,
  supportsReadReceipts,
  reactions,
  reactionPickerMsgId,
  reactionEmojis,
  replySource,
  onToggleReaction,
  onToggleReactionPicker,
  onReply,
  onDelete,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  return (
    <div
      id={`msg-${message.id}`}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} transition-all`}
    >
      <div className="relative group max-w-[70%]">
        {/* Reply preview */}
        {message.reply_to_id && replySource && (
          <div
            className={`text-xs mb-1 px-3 py-1 rounded-t border-l-2 border-primary/60 bg-muted/60 cursor-pointer truncate ${
              isOwn ? "text-right" : "text-left"
            }`}
            onClick={() => {
              const el = document.getElementById(`msg-${replySource.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-primary");
                setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
              }
            }}
          >
            <span className="text-muted-foreground">
              ↩ {replySource.sender_id === message.sender_id ? "You" : matchName}
            </span>{" "}
            <span className="text-foreground/70">
              {sanitizeText((replySource.content || "").slice(0, 60))}
              {(replySource.content || "").length > 60 ? "..." : ""}
            </span>
          </div>
        )}

        <Card
          className={`px-4 py-3 shadow-none border-0 ${
            message.deleted_at
              ? "bg-muted/30 text-muted-foreground italic rounded-2xl"
              : isOwn
                ? "bg-gradient-to-br from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] text-white rounded-[1.25rem_1.25rem_0.5rem_1.25rem]"
                : "bg-card border border-white/6 text-foreground rounded-[1.25rem_1.25rem_1.25rem_0.5rem]"
          }`}
          onDoubleClick={() => !message.deleted_at && onToggleReactionPicker(message.id)}
        >
          {message.deleted_at ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> {t("messageBubble.deleted")}
            </p>
          ) : message.image_url ? (
            <img
              src={message.image_url}
              alt={t("messageBubble.sharedPhoto")}
              className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
              onClick={() => window.open(message.image_url, "_blank", "noopener,noreferrer")}
            />
          ) : message.voice_url ? (
            <div className="flex items-center gap-3">
              <Mic className="h-5 w-5" />
              <audio controls className="max-w-full h-8">
                <source src={message.voice_url} type="audio/webm" />
                <source src={message.voice_url} type="audio/mp4" />
                {t("messageBubble.audioNotSupported")}
              </audio>
            </div>
          ) : (
            <p className="text-sm">{sanitizeText(message.content || "")}</p>
          )}
          <p className={`text-xs mt-2 ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {isOwn && (
              <span className="ml-1">
                {supportsReadReceipts ? (message.read_at ? " ✓✓" : " ✓") : " ✓"}
              </span>
            )}
          </p>
        </Card>

        {/* Reaction display */}
        {reactions.length > 0 && (
          <div className="flex gap-0.5 mt-1 flex-wrap">
            {[...new Set(reactions.map((r) => r.emoji))].map((emoji) => {
              const count = reactions.filter((r) => r.emoji === emoji).length;
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className="text-xs bg-muted rounded-full px-1.5 py-0.5 hover:bg-muted/80"
                >
                  {emoji} {count > 1 ? count : ""}
                </button>
              );
            })}
          </div>
        )}

        {/* Reaction picker */}
        {reactionPickerMsgId === message.id && (
          <div
            className={`absolute ${isOwn ? "right-0" : "left-0"} -top-10 bg-card border border-border rounded-full shadow-lg px-2 py-1 flex gap-1 z-20`}
          >
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onToggleReaction(message.id, emoji)}
                className="text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reply & Delete actions */}
        {!message.deleted_at && !message.id.startsWith("temp-") && (
          <div
            className={`absolute ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 px-1`}
          >
            <button
              onClick={() => onReply(message)}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              title={t("matches.reply")}
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
            {isOwn && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title={t("common.delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
