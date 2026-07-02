/**
 * usePurchases — unified in-app purchase hook
 *
 * On iOS (native Capacitor app): uses RevenueCat → StoreKit 2
 * On web (Safari / other browsers): falls back to Stripe Checkout
 *
 * Usage:
 *   const { buyProduct, isNative, loading } = usePurchases();
 *   await buyProduct(PRODUCT_IDS.PREMIUM_MONTHLY);
 */

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  REVENUECAT_API_KEY,
  REVENUECAT_ENTITLEMENT,
  COIN_PACK_AMOUNTS,
  SUPERLIKE_PACK_AMOUNTS,
  PRODUCT_IDS,
  type ProductId,
} from "@/lib/iap-products";

export const isNativePlatform = () => {
  const platform = Capacitor.getPlatform();
  return Capacitor.isNativePlatform() || platform === "ios" || platform === "android";
};

// ─── RevenueCat initialisation (runs once on first hook mount) ──────────────
let rcInitialised = false;
let rcCurrentUserId: string | null = null;

async function initRevenueCat(userId: string) {
  // Already initialised for this exact user — nothing to do.
  if (rcInitialised && rcCurrentUserId === userId) return;
  if (!REVENUECAT_API_KEY) {
    console.warn("VITE_REVENUECAT_API_KEY not set — IAP disabled");
    return;
  }
  // Always try to initialise on native platforms
  try {
    if (!rcInitialised) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    }
    // (Re-)identify the current user so purchases are never attributed to a
    // previously logged-in account after a user switch.
    await Purchases.logIn({ appUserID: userId });
    rcInitialised = true;
    rcCurrentUserId = userId;
  } catch (e) {
    console.warn("RevenueCat init failed (non-native env):", e);
  }
}

// ─── Fulfil a consumable purchase server-side ───────────────────────────────
async function fulfillNativePurchase(productId: ProductId): Promise<void> {
  if (COIN_PACK_AMOUNTS[productId] !== undefined) {
    const coins = COIN_PACK_AMOUNTS[productId]!;
    const { error } = await supabase.functions.invoke("fulfill-coins-purchase", {
      body: { product_id: productId, coins, source: "apple_iap" },
    });
    if (error) throw error;
    return;
  }

  if (SUPERLIKE_PACK_AMOUNTS[productId] !== undefined) {
    const amount = SUPERLIKE_PACK_AMOUNTS[productId]!;
    const { error } = await supabase.functions.invoke("fulfill-superlike-iap", {
      body: { product_id: productId, amount, source: "apple_iap" },
    });
    if (error) throw error;
    return;
  }

  if (productId === PRODUCT_IDS.PREMIUM_MONTHLY) {
    // Premium entitlement is tracked by RevenueCat — no server fulfillment needed.
    // check-subscription can query RevenueCat's REST API for server-side verification.
    return;
  }
}

// ─── Web fallback: redirect to Stripe Checkout ──────────────────────────────
async function stripeCheckout(
  productId: ProductId,
  getSession: () => Promise<string | null>
): Promise<void> {
  const token = await getSession();
  if (!token) throw new Error("Not authenticated");

  let fnName: string;
  const body: Record<string, unknown> = { origin: window.location.origin };

  if (COIN_PACK_AMOUNTS[productId] !== undefined) {
    fnName = "create-coins-checkout";
    body.product_id = productId;
    body.coins = COIN_PACK_AMOUNTS[productId];
  } else if (SUPERLIKE_PACK_AMOUNTS[productId] !== undefined) {
    fnName = "create-superlike-checkout";
    body.amount = SUPERLIKE_PACK_AMOUNTS[productId];
  } else if (productId === PRODUCT_IDS.PREMIUM_MONTHLY) {
    fnName = "create-checkout";
  } else {
    throw new Error(`Unknown product: ${productId}`);
  }

  const { data, error } = await supabase.functions.invoke(fnName, { body });
  if (error) throw error;
  if (data?.url) window.location.href = data.url;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function usePurchases() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);

  // Initialise RevenueCat on native
  useEffect(() => {
    if (user) {
      initRevenueCat(user.id).catch(console.error);
    }
  }, [user]);

  // Check premium entitlement
  const checkPremium = useCallback(async () => {
    if (!user) return false;

    if (rcInitialised) {
      try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        const active = !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT];
        setHasPremium(active);
        return active;
      } catch {
        // fall through to Supabase check
      }
    }

    // Web / fallback: call the Supabase Edge Function
    const { data } = await supabase.functions.invoke("check-subscription");
    const active = !!data?.subscribed;
    setHasPremium(active);
    return active;
  }, [user]);

  useEffect(() => {
    checkPremium();
  }, [checkPremium]);

  const buyProduct = useCallback(
    async (productId: ProductId) => {
      if (!user) {
        toast.error("Please sign in first");
        return;
      }
      setLoading(true);
      try {
        if (isNativePlatform() || rcInitialised) {
          // ── Native iOS / StoreKit ──────────────────────────────────────
          await initRevenueCat(user.id);

          // Always use purchasePackage — purchaseStoreProduct loses the native
          // identifier key when the StoreProduct crosses the Capacitor bridge.
          const { current, all } = await Purchases.getOfferings();

          // Search current offering first, then fall back to ALL offerings
          // (handles case where default offering isn't marked as "current" in RevenueCat)
          const currentPkgs = current?.availablePackages ?? [];
          const allPkgs = Object.values(all ?? {}).flatMap((o) => o.availablePackages);
          const searchPool = currentPkgs.length > 0 ? currentPkgs : allPkgs;

          const pkg =
            searchPool.find((p) => p.product.identifier === productId) ??
            allPkgs.find((p) => p.product.identifier === productId);

          if (!pkg) {
            const available = allPkgs.map((p) => p.product.identifier).join(", ") || "none";
            throw new Error(
              `Product "${productId}" not found in any RevenueCat offering. ` +
                `Available products: ${available}`
            );
          }

          const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

          if (productId === PRODUCT_IDS.PREMIUM_MONTHLY) {
            const active = !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT];
            setHasPremium(active);
            if (active) toast.success("Welcome to Premium! 🎉");
          } else {
            // Consumable — fulfil server-side (add coins / superlikes)
            await fulfillNativePurchase(productId);
            toast.success("Purchase successful!");
          }
        } else {
          // ── Web: Stripe Checkout ────────────────────────────────────────
          const {
            data: { session },
          } = await supabase.auth.getSession();
          await stripeCheckout(productId, async () => session?.access_token ?? null);
          // Page redirects to Stripe — no further action needed here
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Purchase failed";
        // User cancelled is not an error
        if (!msg.toLowerCase().includes("cancel")) {
          toast.error(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { buyProduct, hasPremium, checkPremium, loading, isNative: isNativePlatform() };
}
