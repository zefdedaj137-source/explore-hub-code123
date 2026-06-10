/**
 * fulfill-coins-purchase
 *
 * Called from the iOS app (via usePurchases hook) after a successful
 * StoreKit / RevenueCat coin pack purchase.
 *
 * For web Stripe purchases, call this after the Stripe success redirect.
 *
 * Body: { product_id: string, coins: number, source: "apple_iap" | "stripe" }
 *
 * Idempotency: uses apple_iap_fulfillments table keyed on
 *   (user_id, product_id, transaction_id) to prevent double-credits.
 *   For Stripe, uses stripe_session_id.
 */

import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const body = (await req.json()) as {
      product_id?: string;
      coins?: number;
      source: "apple_iap" | "stripe";
      transaction_id?: string;
      stripe_session_id?: string;
    };

    const { product_id, coins, source, transaction_id, stripe_session_id } = body;

    // ── For Stripe: resolve product_id and coins from session metadata ─────
    if (source === "stripe" && stripe_session_id) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
        apiVersion: "2025-08-27.basil",
      });
      const session = await stripe.checkout.sessions.retrieve(stripe_session_id);
      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ success: false, error: "Payment not completed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (session.metadata?.user_id !== user.id) {
        throw new Error("Session does not belong to this user");
      }
      product_id = session.metadata?.product_id ?? product_id;
      coins = parseInt(session.metadata?.coins ?? "0", 10) || coins;
    }

    if (!product_id || !coins || coins <= 0) {
      throw new Error("Invalid product_id or coins amount");
    }

    // ── Idempotency check ──────────────────────────────────────────────────
    const idempotencyKey =
      source === "apple_iap"
        ? `${user.id}_${product_id}_${transaction_id ?? "notx"}`
        : `stripe_${stripe_session_id ?? "nosession"}`;

    const { data: existing } = await supabaseAdmin
      .from("coin_fulfillments")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      return new Response(
        JSON.stringify({ success: true, already_fulfilled: true, balance: wallet?.balance ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Credit coins atomically ────────────────────────────────────────────
    // Upsert wallet (creates if missing), then increment balance
    const { error: upsertError } = await supabaseAdmin
      .from("wallets")
      .upsert({ user_id: user.id, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
    if (upsertError) throw upsertError;

    const { data: wallet, error: fetchError } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    if (fetchError || !wallet) throw fetchError ?? new Error("Wallet not found");

    const newBalance = wallet.balance + coins;
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (updateError) throw updateError;

    // Record transaction
    const { error: txError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({ user_id: user.id, amount: coins, type: "purchase", item: product_id });
    if (txError) {
      // Rollback balance increment
      await supabaseAdmin
        .from("wallets")
        .update({ balance: wallet.balance })
        .eq("user_id", user.id);
      throw txError;
    }

    // Record fulfillment (idempotency lock)
    await supabaseAdmin
      .from("coin_fulfillments")
      .insert({ user_id: user.id, product_id, coins, source, idempotency_key: idempotencyKey });

    return new Response(JSON.stringify({ success: true, balance: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
