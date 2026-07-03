// @ts-nocheck
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Verify the caller is an authenticated Supabase user.
    // The JWT is either the anon key (for server-side calls using service role)
    // or a user JWT. We only allow:
    //   a) requests signed with the SERVICE_ROLE_KEY (internal server calls), OR
    //   b) authenticated user JWTs — but only to notify THEMSELVES (user_id == caller)
    const authHeader = req.headers.get("authorization") ?? "";
    const callerToken = authHeader.replace(/^Bearer\s+/i, "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole = callerToken === serviceRoleKey;

    // For non-service-role calls, verify the JWT and confirm the caller
    // is only sending notifications to themselves.
    if (!isServiceRole) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const verifyClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", anonKey, {
        global: { headers: { authorization: authHeader } },
      });
      const {
        data: { user },
        error: authError,
      } = await verifyClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      // Parse body to check user_id before proceeding
      const body_text = await req.text();
      const parsed = JSON.parse(body_text);
      if (parsed.user_id && parsed.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden: cannot notify other users" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
      // Re-use parsed body below by reconstructing the request-like object
      return await handlePush(req, parsed, serviceRoleKey, corsHeaders);
    }

    // Service-role fast path: parse body and delegate
    const bodyJson = await req.json();
    return await handlePush(req, bodyJson, serviceRoleKey, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Shared handler used by the service-role fast path and the re-parsed user path
async function handlePush(
  _req: Request,
  body: { user_id?: string; title?: string; body?: string; url?: string },
  serviceRoleKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const webpush = (await import("https://esm.sh/web-push@3.6.7")).default;
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { user_id, title, body: msgBody, url } = body;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, note: "VAPID keys not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const query = supabaseClient.from("push_subscriptions").select("endpoint,p256dh,auth");
    if (user_id) query.eq("user_id", user_id);
    const { data, error } = await query;
    if (error) throw error;
    const payload = JSON.stringify({
      title: title || "Shqiponja",
      body: msgBody || "You have a new update.",
      url: url || "/notifications",
    });
    const results = await Promise.all(
      (data || []).map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          return { success: true };
        } catch (err) {
          console.error("Push error", err);
          return { success: false };
        }
      })
    );
    const successCount = results.filter((r: { success: boolean }) => r.success).length;
    return new Response(JSON.stringify({ success: true, sent: successCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}
