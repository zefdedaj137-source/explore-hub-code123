import { useRef, useCallback } from "react";

/**
 * Hook that rate-limits a callback. Returns a wrapped version that
 * no-ops if called again within `intervalMs` of the last invocation.
 */
export function useRateLimit<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number
): T {
  const lastCall = useRef(0);

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();
      if (now - lastCall.current < intervalMs) return;
      lastCall.current = now;
      return fn(...args);
    }) as unknown as T,
    [fn, intervalMs]
  );
}
