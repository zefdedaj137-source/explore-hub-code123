/**
 * Simple client-side rate limiter.
 * Returns a wrapped function that only executes if enough time has passed since the last call.
 */
export function rateLimit<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall < intervalMs) return undefined;
    lastCall = now;
    return fn(...args);
  };
}

/**
 * Debounce: delays execution until `delayMs` after the last invocation.
 * Useful for search inputs, typing indicators, etc.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
