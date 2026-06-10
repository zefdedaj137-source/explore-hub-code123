/**
 * Shqiponja — In-App Purchase Product Catalog
 *
 * These identifiers MUST match exactly what you create in App Store Connect:
 *   App Store Connect → Your App → Monetization → In-App Purchases
 *
 * Product types:
 *   - Subscriptions → "Auto-Renewable Subscription"
 *   - One-time purchases → "Consumable"
 */

export const PRODUCT_IDS = {
  // ── Subscription ──────────────────────────────────────────────────────────
  PREMIUM_MONTHLY: "com.shqiponja.app.premium_monthly_1",

  // ── Coin packs (Consumable) ───────────────────────────────────────────────
  COINS_5: "com.shqiponja.app.coins_5", // 5 coins  — ~€2.99
  COINS_20: "com.shqiponja.app.coins_20", // 20 coins — ~€8.99
  COINS_50: "com.shqiponja.app.coins_50", // 50 coins — ~€19.99

  // ── Superlikes (Consumable) ───────────────────────────────────────────────
  SUPERLIKES_1: "com.shqiponja.app.superlikes_1", // 1 superlike  — ~€2.99
  SUPERLIKES_5: "com.shqiponja.app.superlikes_5", // 5 superlikes — ~€9.99
  SUPERLIKES_10: "com.shqiponja.app.superlikes_10", // 10 superlikes — ~€17.99
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

/** Maps each product to the coins credited in the wallet */
export const COIN_PACK_AMOUNTS: Partial<Record<ProductId, number>> = {
  [PRODUCT_IDS.COINS_5]: 5,
  [PRODUCT_IDS.COINS_20]: 20,
  [PRODUCT_IDS.COINS_50]: 50,
};

/** Maps each superlike product to the number of superlikes credited */
export const SUPERLIKE_PACK_AMOUNTS: Partial<Record<ProductId, number>> = {
  [PRODUCT_IDS.SUPERLIKES_1]: 1,
  [PRODUCT_IDS.SUPERLIKES_5]: 5,
  [PRODUCT_IDS.SUPERLIKES_10]: 10,
};

/**
 * RevenueCat entitlement identifier.
 * Create this in the RevenueCat dashboard → Entitlements → "premium"
 */
export const REVENUECAT_ENTITLEMENT = "premium";

/**
 * RevenueCat public SDK key.
 * Set VITE_REVENUECAT_API_KEY in your .env (or Vercel env vars).
 * Get it from: RevenueCat Dashboard → Project → API Keys → Public app-specific key (iOS)
 */
export const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY as string;
