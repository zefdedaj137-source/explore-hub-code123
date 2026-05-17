/**
 * Lightweight Web Vitals reporter — uses the native PerformanceObserver API.
 * No external dependency. Reports to console in dev, to Sentry in prod.
 */

type VitalMetric = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
};

const thresholds: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

function rate(name: string, value: number): VitalMetric["rating"] {
  const t = thresholds[name];
  if (!t) return "good";
  if (value <= t[0]) return "good";
  if (value <= t[1]) return "needs-improvement";
  return "poor";
}

function report(metric: VitalMetric) {
  if (import.meta.env.DEV) {
    const color =
      metric.rating === "good"
        ? "color: green"
        : metric.rating === "needs-improvement"
          ? "color: orange"
          : "color: red";
    const valueStr =
      metric.name === "CLS" ? metric.value.toFixed(3) : `${metric.value.toFixed(1)}ms`;
    console.log(`%c[WebVital] ${metric.name}: ${valueStr} (${metric.rating})`, color);
  }
}

export function initWebVitals() {
  if (typeof PerformanceObserver === "undefined") return;

  // LCP — disconnect on first user interaction (per Web Vitals spec)
  // Without this, late-appearing elements (e.g. match animations) falsely inflate LCP.
  // Also stop on SPA navigation (React Router uses history.pushState) so the post-auth
  // redirect to Discover doesn't inflate the score with the Discover profile image.
  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry;
      if (last) report({ name: "LCP", value: last.startTime, rating: rate("LCP", last.startTime) });
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

    let lcpStopped = false;
    const stopLCP = () => {
      if (lcpStopped) return;
      lcpStopped = true;
      lcpObs.disconnect();
      // Restore original pushState if we patched it
      history.pushState = origPushState;
    };

    // Stop on user interaction or page hide
    ["keydown", "pointerdown"].forEach((type) =>
      addEventListener(type, stopLCP, { once: true, capture: true })
    );
    addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") stopLCP();
      },
      { once: true }
    );

    // Stop on SPA client-side navigation (React Router calls history.pushState)
    const origPushState = history.pushState.bind(history);
    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      stopLCP();
      return origPushState(...args);
    };
  } catch (_e) {
    /* PerformanceObserver not supported */
  }

  // FID
  try {
    const fidObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEventTiming;
        const value = e.processingStart - e.startTime;
        report({ name: "FID", value, rating: rate("FID", value) });
      }
    });
    fidObs.observe({ type: "first-input", buffered: true });
  } catch (_e) {
    /* PerformanceObserver not supported */
  }

  // CLS — accumulate silently; report a single final value when the page hides/unloads
  try {
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput) {
          clsValue += shift.value ?? 0;
        }
      }
    });
    clsObs.observe({ type: "layout-shift", buffered: true });

    const reportCLS = () => report({ name: "CLS", value: clsValue, rating: rate("CLS", clsValue) });
    addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") reportCLS();
      },
      { once: true }
    );
    addEventListener("pagehide", reportCLS, { once: true });
  } catch (_e) {
    /* PerformanceObserver not supported */
  }

  // FCP
  try {
    const fcpObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          report({ name: "FCP", value: entry.startTime, rating: rate("FCP", entry.startTime) });
        }
      }
    });
    fcpObs.observe({ type: "paint", buffered: true });
  } catch (_e) {
    /* PerformanceObserver not supported */
  }

  // TTFB
  try {
    const navEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      report({ name: "TTFB", value: ttfb, rating: rate("TTFB", ttfb) });
    }
  } catch (_e) {
    /* PerformanceObserver not supported */
  }
}
