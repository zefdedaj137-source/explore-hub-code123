type EventParams = Record<string, string | number | boolean>;

const GA_ID = import.meta.env.VITE_GA_TRACKING_ID as string | undefined;

/** Inject the GA4 script tag once */
let gaLoaded = false;
function ensureGA() {
  if (gaLoaded || !GA_ID) return;
  gaLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    (window.dataLayer as unknown[]).push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

/** Track a custom event */
export function trackEvent(name: string, params?: EventParams) {
  ensureGA();
  window.gtag?.("event", name, params);
  if (import.meta.env.DEV) {
    console.debug("[analytics]", name, params);
  }
}

// ── Predefined events ──────────────────────────────────
export const analytics = {
  signUp: (method: string) => trackEvent("sign_up", { method }),
  login: (method: string) => trackEvent("login", { method }),
  logout: () => trackEvent("logout"),

  like: (targetId: string) => trackEvent("like", { target_id: targetId }),
  pass: (targetId: string) => trackEvent("pass", { target_id: targetId }),
  superlike: (targetId: string) => trackEvent("superlike", { target_id: targetId }),
  match: (matchId: string) => trackEvent("match", { match_id: matchId }),

  messageSent: (matchId: string) => trackEvent("message_sent", { match_id: matchId }),
  callStarted: (type: "voice" | "video") => trackEvent("call_started", { call_type: type }),

  purchase: (item: string, amount: number) =>
    trackEvent("purchase", { item, value: amount, currency: "USD" }),

  pageView: (path: string) => trackEvent("page_view", { page_path: path }),
};

// Extend Window for gtag
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
