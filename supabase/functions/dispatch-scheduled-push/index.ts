// @ts-nocheck
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "Missing VAPID keys" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const now = new Date().toISOString();
    const { data: jobs, error: jobsError } = await supabaseClient
      .from("scheduled_push_notifications")
      .select("id, title, body, url, target_user_id")
      .eq("status", "pending")
      .lte("send_at", now)
      .limit(50);

    if (jobsError) throw jobsError;

    let sent = 0;
    for (const job of jobs || []) {
      const subscriptionsQuery = supabaseClient
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth");

      if (job.target_user_id) {
        subscriptionsQuery.eq("user_id", job.target_user_id);
      }

      const { data: subs, error: subsError } = await subscriptionsQuery;
      if (subsError) throw subsError;

      const payload = JSON.stringify({
        title: job.title,
        body: job.body,
        url: job.url || "/notifications",
      });

      await Promise.all(
        (subs || []).map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
        )
      );

      await supabaseClient
        .from("scheduled_push_notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", job.id);

      sent += 1;
    }

    return new Response(JSON.stringify({ success: true, processed: sent }), {
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
});
