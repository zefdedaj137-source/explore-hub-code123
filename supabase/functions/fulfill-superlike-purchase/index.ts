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

  const supabaseClient = createClient(
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

    const { session_id } = (await req.json()) as { session_id: string };
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify the session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    const amount = parseInt(session.metadata?.superlike_amount ?? "0", 10);
    if (!amount) throw new Error("Invalid superlike amount in session metadata");

    // Check if already fulfilled (idempotency)
    const { data: existing } = await supabaseClient
      .from("superlike_fulfillments")
      .select("id")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existing) {
      // Already fulfilled — just return current balance
      const { data: profile } = await supabaseClient
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Add superlikes via RPC
    const { data: rpcData, error: rpcError } = (await supabaseClient.rpc(
      "add_purchased_superlikes",
      {
        p_user_id: user.id,
        p_amount: amount,
        p_price: (session.amount_total ?? 0) / 100,
      }
    )) as { data: { success: boolean; superlikes_remaining: number } | null; error: unknown };

    if (rpcError) throw rpcError;

    // Record fulfillment
    await supabaseClient.from("superlike_fulfillments").insert({
      stripe_session_id: session_id,
      user_id: user.id,
      amount,
    });

    return new Response(
      JSON.stringify({ success: true, superlikes_remaining: rpcData?.superlikes_remaining ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
