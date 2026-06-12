import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Geolocation } from "@capacitor/geolocation";
import { Camera } from "@capacitor/camera";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "ios-permissions-requested";

function isNative(): boolean {
  return !!(
    window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.();
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Requests iOS permissions in sequence once per install, after the user
 * has logged in. Each permission gets its own native iOS dialog so the
 * user understands why each one is needed.
 *
 * Order: Push Notifications → Location → Camera + Photo Library
 * (Microphone is triggered contextually when the user makes a call.)
 */
export function useIOSPermissions(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    if (!isNative()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Mark as done immediately so a re-render doesn't double-trigger
    localStorage.setItem(STORAGE_KEY, "1");

    (async () => {
      // Small delay — let the home screen finish rendering first
      await delay(2500);

      // ── 1. Push Notifications ────────────────────────────────────────────
      try {
        const { receive } = await PushNotifications.checkPermissions();
        if (receive === "prompt" || receive === "prompt-with-rationale") {
          await PushNotifications.requestPermissions();
          // Register with APNs so we can actually receive tokens
          const { receive: after } = await PushNotifications.checkPermissions();
          if (after === "granted") {
            await PushNotifications.register();
          }
        }
      } catch (err) {
        logger.error("[permissions] push notifications:", err);
      }

      await delay(500);

      // ── 2. Location (When In Use) ────────────────────────────────────────
      try {
        const { location } = await Geolocation.checkPermissions();
        if (location === "prompt" || location === "prompt-with-rationale") {
          await Geolocation.requestPermissions({ permissions: ["location"] });
        }
      } catch (err) {
        logger.error("[permissions] location:", err);
      }

      await delay(500);

      // ── 3. Camera + Photo Library ────────────────────────────────────────
      try {
        const camPerms = await Camera.checkPermissions();
        if (
          camPerms.camera === "prompt" ||
          camPerms.camera === "prompt-with-rationale" ||
          camPerms.photos === "prompt" ||
          camPerms.photos === "prompt-with-rationale"
        ) {
          await Camera.requestPermissions({ permissions: ["camera", "photos"] });
        }
      } catch (err) {
        logger.error("[permissions] camera:", err);
      }

      // ── 4. Microphone — triggered via getUserMedia ───────────────────────
      // iOS shows its own dialog the first time getUserMedia({ audio: true })
      // is called. We trigger it silently here so calls work without a cold-start
      // permission prompt.
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        // User denied or not yet supported — that's fine, handled in CallDialog
      }
    })();
  }, [userId]);
}
