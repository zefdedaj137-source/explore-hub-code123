// @ts-nocheck
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { email, name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = name || email.split("@")[0];

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ExploreHub <welcome@explore-hub-code123.vercel.app>",
        to: [email],
        subject: "Welcome to ExploreHub 💜",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0f17; color: #fff; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ff4d6d, #ff7849); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; color: #fff;">Welcome to ExploreHub 💜</h1>
            </div>
            <div style="padding: 32px;">
              <p style="font-size: 16px; color: #e0e0e0;">Hi ${displayName},</p>
              <p style="font-size: 16px; color: #e0e0e0;">
                We're so excited to have you here! Your account is all set — now it's time to explore, connect, and find your match.
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="https://explore-hub-code123.vercel.app/discover"
                   style="background: linear-gradient(135deg, #ff4d6d, #ff7849); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-size: 16px; font-weight: bold; display: inline-block;">
                  Start Exploring
                </a>
              </div>
              <p style="font-size: 14px; color: #888; margin-top: 32px;">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </div>
            <div style="padding: 16px 32px; border-top: 1px solid #222; text-align: center;">
              <p style="font-size: 12px; color: #555; margin: 0;">© 2026 ExploreHub. All rights reserved.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-welcome error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
