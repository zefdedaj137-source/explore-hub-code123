/**
 * fulfill-superlike-iap
 *
 * Called from the iOS app after a successful StoreKit / RevenueCat
 * superlike pack purchase. Mirrors the existing fulfill-superlike-purchase
 * function but accepts an IAP transaction_id instead of a Stripe session_id.
 *
 * Body: { product_id: string, amount: number, source: "apple_iap", transaction_id?: string }
 */

import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      product_id: string;
      amount: number;
      source: "apple_iap";
      transaction_id?: string;
    };

    const { product_id, amount, transaction_id } = body;

    if (!product_id || !amount || amount <= 0) {
      throw new Error("Invalid product_id or amount");
    }

    const idempotencyKey = `${user.id}_${product_id}_${transaction_id ?? "notx"}`;

    // Idempotency: check superlike_fulfillments (reuse existing table)
    const { data: existing } = await supabaseAdmin
      .from("superlike_fulfillments")
      .select("id")
      .eq("stripe_session_id", idempotencyKey) // reuse stripe_session_id column as generic key
      .maybeSingle();

    if (existing) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("superlikes_remaining")
        .eq("id", user.id)
        .single();
      return new Response(
        JSON.stringify({
          success: true,
          already_fulfilled: true,
          superlikes_remaining: profile?.superlikes_remaining ?? 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit superlikes via existing RPC
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("add_purchased_superlikes", {
      p_user_id: user.id,
      p_amount: amount,
    });
    if (rpcError) throw rpcError;

    // Record fulfillment
    await supabaseAdmin.from("superlike_fulfillments").insert({
      user_id: user.id,
      stripe_session_id: idempotencyKey, // repurposing column as idempotency key
      superlikes_added: amount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        superlikes_remaining:
          (rpcData as { superlikes_remaining?: number })?.superlikes_remaining ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
