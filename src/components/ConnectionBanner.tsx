import { useConnectionStatus } from "@/hooks/useConnectionStatus";

export function ConnectionBanner() {
  const { isOnline, wasOffline } = useConnectionStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] text-center text-xs font-semibold py-1.5 transition-colors duration-300 ${
        isOnline ? "bg-green-500 text-white" : "bg-destructive text-destructive-foreground"
      }`}
    >
      {isOnline ? "Back online ✓" : "No internet connection"}
    </div>
  );
}
