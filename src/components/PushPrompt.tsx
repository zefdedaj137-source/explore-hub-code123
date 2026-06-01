import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPush } from "@/lib/push";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const DISMISSED_KEY = "push-prompt-dismissed";
/** Re-show the prompt after 30 days if the user dismissed it */
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const { dismissed_at } = JSON.parse(raw) as { dismissed_at: number };
    return Date.now() - dismissed_at < DISMISS_TTL_MS;
  } catch {
    // Legacy "1" value — treat as permanent until TTL migrated
    return true;
  }
}

export const PushPrompt = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "default") return;
    if (wasDismissedRecently()) return;

    // Show after a longer delay so the user has had time to engage with the app
    const timer = setTimeout(() => setVisible(true), 15000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && user) {
        await subscribeToPush(user.id);
        toast.success(t("pushPrompt.enabled"));
      }
    } catch {
      toast.error(t("pushPrompt.failed"));
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ dismissed_at: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 rounded-xl border bg-card p-4 shadow-lg">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        aria-label={t("pushPrompt.dismiss")}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{t("pushPrompt.stayInLoop")}</p>
          <p className="text-xs text-muted-foreground">{t("pushPrompt.description")}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={handleEnable}>
              {t("pushPrompt.enable")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {t("pushPrompt.notNow")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
