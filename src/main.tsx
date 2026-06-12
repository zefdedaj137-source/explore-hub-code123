import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { validateEnv } from "./lib/env";
import { initWebVitals } from "./lib/webVitals";
import { initOfflineQueue, QueuedAction } from "./lib/offlineQueue";
import { supabase } from "./integrations/supabase/client";
import "./lib/i18n";

validateEnv();
initSentry();
initWebVitals();

// Force touchstart/touchmove listeners to be passive globally.
// Third-party libs (embla-carousel, vaul, framer-motion) register these as
// non-passive, causing scroll-blocking violations. Safe to patch here because
// the swipe card uses CSS `touch-action: none` for scroll prevention instead
// of calling preventDefault(), so no library needs a non-passive touch listener.
const _origAEL = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
) {
  if (type === "touchstart" || type === "touchmove") {
    const patched: AddEventListenerOptions =
      typeof options === "boolean"
        ? { capture: options, passive: true }
        : { ...(options as AddEventListenerOptions), passive: true };
    _origAEL.call(this, type, listener, patched);
  } else {
    _origAEL.call(this, type, listener, options);
  }
};

// Replay queued offline actions when connectivity returns
initOfflineQueue(async (action: QueuedAction) => {
  if (action.method === "rpc") {
    const { error } = await supabase.rpc(action.table, action.payload as Record<string, unknown>);
    return !error;
  }
  const q = supabase.from(action.table);
  const { error } =
    action.method === "insert"
      ? await q.insert(action.payload as Record<string, unknown>)
      : action.method === "update"
        ? await q.update(action.payload as Record<string, unknown>)
        : await q.delete();
  return !error;
});

// Apply saved theme immediately before React renders to prevent flash
(() => {
  const saved = localStorage.getItem("app-theme");
  if (saved && ["light", "white", "dark", "blue"].includes(saved)) {
    const root = document.documentElement;
    root.classList.remove("light", "white", "dark", "blue");
    root.classList.add(saved);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore registration errors in dev
    });
  });
}
