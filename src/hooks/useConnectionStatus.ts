import { useState, useEffect, useRef } from "react";

/**
 * Hook that tracks online/offline status and shows reconnection state.
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        // Show "reconnected" briefly then clear
        setTimeout(() => setWasOffline(false), 3000);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
