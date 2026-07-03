import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/**
 * Supabase auth storage adapter.
 *
 * On native platforms (iOS/Android) the WKWebView/WebView `localStorage` is
 * treated as cache and can be evicted by the OS between app launches, which
 * silently logs the user out. Capacitor Preferences persists to native storage
 * (UserDefaults on iOS, SharedPreferences on Android), so the session survives
 * until the user explicitly signs out.
 *
 * On web we keep using `localStorage` for standard browser behavior.
 */
const isNative = Capacitor.isNativePlatform();

export const supabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isNative) {
      await Preferences.set({ key, value });
      return;
    }
    localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isNative) {
      await Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  },
};
