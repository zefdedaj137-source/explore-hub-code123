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

async function initRevenueCat(userId: string) {
  if (rcInitialised) return;
  if (!REVENUECAT_API_KEY) {
    console.warn("VITE_REVENUECAT_API_KEY not set — IAP disabled");
    return;
  }
  // Always try to initialise on native platforms
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    await Purchases.logIn({ appUserID: userId });
    rcInitialised = true;
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

          if (productId === PRODUCT_IDS.PREMIUM_MONTHLY) {
            // Try RevenueCat Offerings first; fall back to direct StoreKit if empty
            const { current } = await Purchases.getOfferings();
            const pkg =
              current?.availablePackages.find((p) => p.product.identifier === productId) ??
              current?.availablePackages[0];

            let customerInfo;
            if (pkg) {
              ({ customerInfo } = await Purchases.purchasePackage({ aPackage: pkg }));
            } else {
              // Offerings not configured in RevenueCat — purchase directly via StoreKit
              const { products } = await Purchases.getProducts({
                productIdentifiers: [productId],
              });
              const storeProduct = products[0];
              if (!storeProduct)
                throw new Error(
                  "Subscription product not found in App Store. Check App Store Connect status."
                );
              const result = await Purchases.purchaseStoreProduct({ product: storeProduct });
              customerInfo = result.customerInfo;
            }
            const active = !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT];
            setHasPremium(active);
            if (active) toast.success("Welcome to Premium! 🎉");
          } else {
            // Consumable: fetch the real StoreProduct first, then purchase
            const { products } = await Purchases.getProducts({
              productIdentifiers: [productId],
            });
            const storeProduct = products[0];
            if (!storeProduct)
              throw new Error(
                "Product not found in App Store. Check product ID and App Store Connect status."
              );
            const { transaction } = await Purchases.purchaseStoreProduct({
              product: storeProduct,
            });
            if (transaction) {
              await fulfillNativePurchase(productId);
              toast.success("Purchase successful!");
            }
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
