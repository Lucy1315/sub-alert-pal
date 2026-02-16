import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const NOTIFICATIONAPI_CLIENT_ID = Deno.env.get("NOTIFICATIONAPI_CLIENT_ID");
    const NOTIFICATIONAPI_CLIENT_SECRET = Deno.env.get("NOTIFICATIONAPI_CLIENT_SECRET");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current date in Asia/Seoul timezone
    const now = new Date();
    const seoulDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const todayStr = seoulDate.toISOString().split("T")[0];

    console.log(`[LIVE MODE] Checking renewals for ${todayStr}`);

    // Get all enabled reminder rules with their subscriptions and user profiles
    const { data: rules, error: rulesError } = await supabase
      .from("reminder_rules")
      .select(`
        id,
        offset_days,
        channel,
        subscription_id,
        subscriptions!inner (
          id,
          user_id,
          service_name,
          plan_name,
          renewal_date,
          price,
          currency,
          status
        )
      `)
      .eq("enabled", true)
      .eq("subscriptions.status", "active");

    if (rulesError) throw rulesError;

    let sentCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const rule of rules || []) {
      const sub = (rule as any).subscriptions;
      if (!sub) continue;

      // Calculate target date: renewal_date - offset_days
      const renewalDate = new Date(sub.renewal_date);
      const targetDate = new Date(renewalDate);
      targetDate.setDate(targetDate.getDate() - rule.offset_days);
      const targetStr = targetDate.toISOString().split("T")[0];

      if (targetStr !== todayStr) continue;

      // Get user profile for email and phone
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, display_name")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      // Get user email from auth
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(sub.user_id);
      const userEmail = authUser?.email;

      if (rule.channel === "email" && RESEND_API_KEY && userEmail) {
        try {
          // Check dedup: unique on (subscription_id, channel, sent_date, offset_days)
          const { data: existing } = await supabase
            .from("notification_logs")
            .select("id")
            .eq("subscription_id", sub.id)
            .eq("channel", "email")
            .eq("sent_date", todayStr)
            .eq("offset_days", rule.offset_days)
            .maybeSingle();

          if (existing) {
            skipCount++;
            console.log(`[SKIP] Dedup: ${sub.service_name} email offset=${rule.offset_days}`);
            continue;
          }

          const offsetLabel = rule.offset_days === 0 ? "오늘" : `${rule.offset_days}일 전`;
          const emailBody = `
            <h2>구독 결제일 알림</h2>
            <p><strong>${sub.service_name}</strong>${sub.plan_name ? ` (${sub.plan_name})` : ""} 구독이 <strong>${sub.renewal_date}</strong>에 갱신됩니다.</p>
            <p>금액: ${sub.price} ${sub.currency}</p>
            <p>${offsetLabel} 알림입니다.</p>
          `;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "SubReminder <onboarding@resend.dev>",
              to: [userEmail],
              subject: `[SubReminder] ${sub.service_name} 결제일 ${offsetLabel}`,
              html: emailBody,
            }),
          });

          const emailData = await emailRes.json();
          const status = emailRes.ok ? "success" : "failed";

          await supabase.from("notification_logs").insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            subscription_name: sub.service_name,
            channel: "email",
            status,
            recipient: userEmail,
            error_message: emailRes.ok ? null : JSON.stringify(emailData),
            sent_date: todayStr,
            offset_days: rule.offset_days,
            test_run: false,
          });

          if (emailRes.ok) sentCount++;
          else errorCount++;
          console.log(`[EMAIL] ${status}: ${sub.service_name} -> ${userEmail}`);
        } catch (e) {
          errorCount++;
          console.error(`[EMAIL ERROR] ${sub.service_name}:`, e);
          await supabase.from("notification_logs").insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            subscription_name: sub.service_name,
            channel: "email",
            status: "failed",
            recipient: userEmail,
            error_message: String(e),
            sent_date: todayStr,
            offset_days: rule.offset_days,
            test_run: false,
          });
        }
      }

      if (rule.channel === "sms" && NOTIFICATIONAPI_CLIENT_ID && NOTIFICATIONAPI_CLIENT_SECRET && profile?.phone_number) {
        try {
          const { data: existing } = await supabase
            .from("notification_logs")
            .select("id")
            .eq("subscription_id", sub.id)
            .eq("channel", "sms")
            .eq("sent_date", todayStr)
            .eq("offset_days", rule.offset_days)
            .maybeSingle();

          if (existing) {
            skipCount++;
            console.log(`[SKIP] Dedup: ${sub.service_name} sms offset=${rule.offset_days}`);
            continue;
          }

          const smsRes = await fetch(
            `https://api.notificationapi.com/${NOTIFICATIONAPI_CLIENT_ID}/sender`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(NOTIFICATIONAPI_CLIENT_ID + ":" + NOTIFICATIONAPI_CLIENT_SECRET)}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "renewal_reminder",
                to: {
                  id: sub.user_id,
                  number: profile.phone_number,
                },
                sms: {
                  message: `[SubReminder] ${sub.service_name} 구독이 ${sub.renewal_date}에 갱신됩니다. 금액: ${sub.price} ${sub.currency}`,
                },
              }),
            }
          );

          const smsData = await smsRes.text();
          const status = smsRes.ok ? "success" : "failed";

          await supabase.from("notification_logs").insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            subscription_name: sub.service_name,
            channel: "sms",
            status,
            recipient: profile.phone_number,
            error_message: smsRes.ok ? null : smsData,
            sent_date: todayStr,
            offset_days: rule.offset_days,
            test_run: false,
          });

          if (smsRes.ok) sentCount++;
          else errorCount++;
          console.log(`[SMS] ${status}: ${sub.service_name} -> ${profile.phone_number}`);
        } catch (e) {
          errorCount++;
          console.error(`[SMS ERROR] ${sub.service_name}:`, e);
          await supabase.from("notification_logs").insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            subscription_name: sub.service_name,
            channel: "sms",
            status: "failed",
            recipient: profile.phone_number,
            error_message: String(e),
            sent_date: todayStr,
            offset_days: rule.offset_days,
            test_run: false,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        sent: sentCount,
        skipped: skipCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
