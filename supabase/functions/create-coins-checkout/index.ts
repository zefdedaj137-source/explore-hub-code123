/**
 * create-coins-checkout
 *
 * Web-only Stripe Checkout for coin pack purchases.
 * On iOS native builds, coins are purchased via RevenueCat / StoreKit.
 *
 * Body: { product_id: string, coins: number, origin?: string }
 */

import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prices in euro cents — keep in sync with iap-products.ts values
const COIN_PACK_PRICES: Record<string, { unit_amount: number; label: string }> = {
  "com.shqiponja.app.coins_5": { unit_amount: 299, label: "5 Coins" },
  "com.shqiponja.app.coins_20": { unit_amount: 899, label: "20 Coins" },
  "com.shqiponja.app.coins_50": { unit_amount: 1999, label: "50 Coins" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAnon.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = (await req.json()) as { product_id: string; coins: number; origin?: string };
    const { product_id, coins } = body;
    const origin =
      body.origin ?? req.headers.get("origin") ?? "https://fqmleivxlqqnlokconux.supabase.co";

    const pack = COIN_PACK_PRICES[product_id];
    if (!pack) throw new Error(`Unknown coin product: ${product_id}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: pack.unit_amount,
            product_data: { name: pack.label },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        user_id: user.id,
        product_id,
        coins: String(coins),
        source: "stripe",
      },
      success_url: `${origin}/coins-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wallet`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
