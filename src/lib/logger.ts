/**
 * Production-safe logger utility
 * Logs to console in development, silent in production
 * Errors are always logged for debugging
 */

import { Sentry } from "./sentry";

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logged, even in production)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);

    if (!isDevelopment) {
      const err = args[0];
      if (err instanceof Error) {
        Sentry.captureException(err);
      } else {
        Sentry.captureMessage(String(err), "error");
      }
    }
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Create a namespaced logger for specific modules
   */
  create: (namespace: string) => ({
    log: (...args: unknown[]) => logger.log(`[${namespace}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${namespace}]`, ...args),
    error: (...args: unknown[]) => logger.error(`[${namespace}]`, ...args),
    debug: (...args: unknown[]) => logger.debug(`[${namespace}]`, ...args),
  }),
};

// Export namespaced loggers for common modules
export const callLogger = logger.create("Call");
export const chatLogger = logger.create("Chat");
export const authLogger = logger.create("Auth");
export const discoverLogger = logger.create("Discover");
