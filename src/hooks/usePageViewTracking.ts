import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analytics } from "@/lib/analytics";

/** Tracks page views on every route change */
export function usePageViewTracking() {
  const location = useLocation();

  useEffect(() => {
    analytics.pageView(location.pathname);
  }, [location.pathname]);
}
