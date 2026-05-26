import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Calendar, Camera, Image as ImageIcon, Mic, Square, X, Reply } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  voice_url?: string;
  image_url?: string;
}

interface ChatInputProps {
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDatePlan: () => void;
  onPhotoGallery: () => void;
  onPhotoCamera: () => void;
  onGifPicker: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioBlob: Blob | null;
  onSendVoice: () => void;
  onCancelVoice: () => void;
  imagePreview: string | null;
  sendingImage: boolean;
  onSendPhoto: () => void;
  onClearImage: () => void;
  blockedByYou: boolean;
  blockedYou: boolean;
  showIcebreakers: boolean;
  messagesEmpty: boolean;
  icebreakerPrompts: string[];
  onIcebreakerClick: (prompt: string) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  matchName?: string;
  currentUserId?: string;
  onTyping: () => void;
}

export function ChatInput({
  newMessage,
  onMessageChange,
  onSubmit,
  onDatePlan,
  onPhotoGallery,
  onPhotoCamera,
  onGifPicker,
  isRecording,
  onStartRecording,
  onStopRecording,
  audioBlob,
  onSendVoice,
  onCancelVoice,
  imagePreview,
  sendingImage,
  onSendPhoto,
  onClearImage,
  blockedByYou,
  blockedYou,
  showIcebreakers,
  messagesEmpty,
  icebreakerPrompts,
  onIcebreakerClick,
  replyingTo,
  onCancelReply,
  matchName,
  currentUserId,
  onTyping,
}: ChatInputProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-nav-offset left-0 right-0 z-10 chat-input-bar">
      {/* Reply-to banner */}
      {replyingTo && (
        <div className="px-4 pt-2 pb-0">
          <div className="container mx-auto max-w-2xl flex items-center gap-2 bg-muted/80 rounded-t-lg px-3 py-2 border-l-2 border-primary">
            <Reply className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">
                {replyingTo.sender_id === currentUserId ? "You" : matchName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {sanitizeText(
                  (replyingTo.image_url
                    ? "📷 Photo"
                    : replyingTo.voice_url
                      ? "🎤 Voice"
                      : replyingTo.content || ""
                  ).slice(0, 80)
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={onCancelReply}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-4">
        {imagePreview ? (
          <div className="container mx-auto max-w-2xl flex flex-col gap-2">
            <div className="relative inline-block w-fit">
              <img src={imagePreview} alt="Preview" className="rounded-lg max-h-40 object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={onClearImage}
                aria-label={t("chatInput.removeImage")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-primary/30"
                onClick={onClearImage}
              >
                Cancel
              </Button>
              <Button
                onClick={onSendPhoto}
                disabled={sendingImage}
                className="bg-primary text-white hover:bg-primary"
              >
                {sendingImage ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-1" /> Send Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : audioBlob ? (
          <div className="container mx-auto max-w-2xl flex gap-2 items-center">
            <div className="flex-1 bg-card rounded-lg p-3 flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">{t("chatInput.voiceMessageRecorded")}</span>
            </div>
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-primary/30"
              onClick={onCancelVoice}
            >
              Cancel
            </Button>
            <Button onClick={onSendVoice} className="bg-primary text-white hover:bg-primary">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="container mx-auto max-w-2xl flex flex-col gap-2">
            {!blockedByYou &&
              !blockedYou &&
              showIcebreakers &&
              messagesEmpty &&
              newMessage.trim().length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {icebreakerPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-border text-foreground hover:bg-primary/30"
                      onClick={() => onIcebreakerClick(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDatePlan}
                className="text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl h-9 w-9"
                disabled={blockedByYou || blockedYou}
                title="Plan a date"
                aria-label={t("chatInput.planADate")}
              >
                <Calendar className="h-4.5 w-4.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onPhotoGallery}
                className="text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl h-9 w-9"
                disabled={blockedByYou || blockedYou}
                title="Send photo"
                aria-label={t("chatInput.sendPhoto")}
              >
                <ImageIcon className="h-4.5 w-4.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onPhotoCamera}
                className="text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl h-9 w-9"
                disabled={blockedByYou || blockedYou}
                title="Take photo"
                aria-label={t("chatInput.takePhoto")}
              >
                <Camera className="h-4.5 w-4.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onGifPicker}
                className="text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl h-9 w-9"
                disabled={blockedByYou || blockedYou}
                title="Send GIF"
                aria-label={t("chatInput.sendGIF")}
              >
                <span className="text-[11px] font-bold">GIF</span>
              </Button>
              <Button
                type="button"
                variant={isRecording ? "destructive" : "ghost"}
                size="icon"
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={
                  isRecording
                    ? "animate-pulse rounded-xl h-9 w-9"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl h-9 w-9"
                }
                disabled={blockedByYou || blockedYou}
                aria-label={isRecording ? "Stop recording" : "Record voice message"}
              >
                {isRecording ? <Square className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => {
                  onMessageChange(e.target.value);
                  if (e.target.value.trim().length > 0) onTyping();
                }}
                placeholder={
                  blockedByYou
                    ? "You've blocked this user"
                    : blockedYou
                      ? "You can't message this user"
                      : t("chat.typeMessage")
                }
                className="flex-1 bg-secondary/50 border-white/8 text-foreground placeholder:text-muted-foreground rounded-xl focus-visible:ring-primary/40"
                disabled={isRecording || blockedByYou || blockedYou}
              />
              <Button
                type="submit"
                className="rounded-xl h-9 w-9 bg-gradient-to-br from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] text-white border-0 shadow-[0_4px_12px_hsl(350,65%,60%,0.3)] hover:brightness-110 disabled:opacity-40 disabled:shadow-none p-0"
                disabled={!newMessage.trim() || isRecording || blockedByYou || blockedYou}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
