import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPush } from "@/lib/push";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "default") return;
    if (wasDismissedRecently()) return;

    // Show after a short delay so it doesn't compete with page load
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && user) {
        await subscribeToPush(user.id);
        toast.success("Push notifications enabled!");
      }
    } catch {
      toast.error("Could not enable notifications.");
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
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Stay in the loop</p>
          <p className="text-xs text-muted-foreground">
            Get notified when someone likes you or sends a message.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={handleEnable}>
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
