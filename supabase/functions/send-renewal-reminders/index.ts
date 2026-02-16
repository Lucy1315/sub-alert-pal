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
    const TEST_MODE = Deno.env.get("TEST_MODE") === "true";
    const TEST_PHONE_NUMBER = Deno.env.get("TEST_PHONE_NUMBER") || "";
    const NOTIFICATIONAPI_CLIENT_ID = Deno.env.get("NOTIFICATIONAPI_CLIENT_ID");
    const NOTIFICATIONAPI_CLIENT_SECRET = Deno.env.get("NOTIFICATIONAPI_CLIENT_SECRET");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current date in Asia/Seoul timezone
    const now = new Date();
    const seoulDate = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );
    const todayStr = seoulDate.toISOString().split("T")[0];

    const results: { email: string | null; sms: string | null } = {
      email: null,
      sms: null,
    };

    if (TEST_MODE) {
      // ======== TEST MODE ========
      console.log(`[TEST MODE] Running test notifications for ${todayStr}`);

      // Test Email via Resend
      if (RESEND_API_KEY) {
        try {
          const emailBody = `
            <h2>[TEST] Daily Renewal Notification Check</h2>
            <p><strong>Date (KST):</strong> ${todayStr}</p>
            <p><strong>System Status:</strong> ✅ Operational</p>
            <p><strong>Mode:</strong> TEST MODE</p>
            <h3>Connected Channels:</h3>
            <ul>
              <li>📧 Email (Resend): ${RESEND_API_KEY ? "Connected" : "Not configured"}</li>
              <li>💬 SMS (NotificationAPI): ${NOTIFICATIONAPI_CLIENT_ID ? "Connected" : "Not configured"}</li>
            </ul>
            <p><strong>Test Phone Number:</strong> ${TEST_PHONE_NUMBER || "Not set"}</p>
            <hr>
            <p><em>This is an automated test notification from SubReminder.</em></p>
          `;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "SubReminder <onboarding@resend.dev>",
              to: ["onboarding@resend.dev"],
              subject: "[TEST] Daily Renewal Notification Check",
              html: emailBody,
            }),
          });

          const emailData = await emailRes.json();
          const emailStatus = emailRes.ok ? "success" : "failed";
          results.email = emailStatus;

          await supabase.from("notification_logs").insert({
            subscription_name: "[TEST] Daily Check",
            channel: "email",
            status: emailStatus,
            recipient: "onboarding@resend.dev",
            error_message: emailRes.ok ? null : JSON.stringify(emailData),
            test_run: true,
          });

          console.log(`[TEST] Email ${emailStatus}:`, emailData);
        } catch (e) {
          console.error("[TEST] Email error:", e);
          results.email = "failed";
          await supabase.from("notification_logs").insert({
            subscription_name: "[TEST] Daily Check",
            channel: "email",
            status: "failed",
            recipient: "onboarding@resend.dev",
            error_message: String(e),
            test_run: true,
          });
        }
      }

      // Test SMS via NotificationAPI
      if (NOTIFICATIONAPI_CLIENT_ID && NOTIFICATIONAPI_CLIENT_SECRET && TEST_PHONE_NUMBER) {
        try {
          const smsRes = await fetch(
            `https://app.notificationapi.com/sender/notificationapi/${NOTIFICATIONAPI_CLIENT_ID}/notifications`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(NOTIFICATIONAPI_CLIENT_ID + ":" + NOTIFICATIONAPI_CLIENT_SECRET)}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                notificationId: "test_renewal_reminder",
                user: {
                  id: "test-user",
                  number: TEST_PHONE_NUMBER,
                },
                mergeTags: {
                  subject: "[TEST] Daily Renewal Check",
                  body: `[TEST] SubReminder system check - ${todayStr} KST. System operational.`,
                },
              }),
            }
          );

          const smsData = await smsRes.text();
          const smsStatus = smsRes.ok ? "success" : "failed";
          results.sms = smsStatus;

          await supabase.from("notification_logs").insert({
            subscription_name: "[TEST] Daily Check",
            channel: "sms",
            status: smsStatus,
            recipient: TEST_PHONE_NUMBER,
            error_message: smsRes.ok ? null : smsData,
            test_run: true,
          });

          console.log(`[TEST] SMS ${smsStatus}:`, smsData);
        } catch (e) {
          console.error("[TEST] SMS error:", e);
          results.sms = "failed";
          await supabase.from("notification_logs").insert({
            subscription_name: "[TEST] Daily Check",
            channel: "sms",
            status: "failed",
            recipient: TEST_PHONE_NUMBER,
            error_message: String(e),
            test_run: true,
          });
        }
      }
    } else {
      // ======== LIVE MODE ========
      console.log(`[LIVE MODE] Checking renewals for ${todayStr}`);

      // Get all subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subError) throw subError;

      for (const sub of subscriptions || []) {
        // Calculate target date
        const renewalDate = new Date(sub.renewal_date);
        const targetDate = new Date(renewalDate);
        targetDate.setDate(targetDate.getDate() - sub.notify_days_before);
        const targetStr = targetDate.toISOString().split("T")[0];

        if (targetStr !== todayStr) continue;

        const recipient = sub.email_recipient || "onboarding@resend.dev";

        // Send email
        if (sub.notify_email && RESEND_API_KEY) {
          try {
            const emailBody = `
              <h2>구독 결제일 알림</h2>
              <p><strong>${sub.name}</strong> 구독이 <strong>${sub.renewal_date}</strong>에 갱신됩니다.</p>
              <p>금액: ${sub.amount} ${sub.currency}</p>
              <p>${sub.notify_days_before}일 전 알림입니다.</p>
            `;

            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "SubReminder <onboarding@resend.dev>",
                to: [recipient],
                subject: `[SubReminder] ${sub.name} 결제일 ${sub.notify_days_before}일 전`,
                html: emailBody,
              }),
            });

            const emailData = await emailRes.json();
            await supabase.from("notification_logs").insert({
              subscription_id: sub.id,
              subscription_name: sub.name,
              channel: "email",
              status: emailRes.ok ? "success" : "failed",
              recipient,
              error_message: emailRes.ok ? null : JSON.stringify(emailData),
              test_run: false,
            });
          } catch (e) {
            await supabase.from("notification_logs").insert({
              subscription_id: sub.id,
              subscription_name: sub.name,
              channel: "email",
              status: "failed",
              recipient,
              error_message: String(e),
              test_run: false,
            });
          }
        }

        // Send SMS
        if (sub.notify_sms && sub.phone_number && NOTIFICATIONAPI_CLIENT_ID && NOTIFICATIONAPI_CLIENT_SECRET) {
          try {
            const smsRes = await fetch(
              `https://app.notificationapi.com/sender/notificationapi/${NOTIFICATIONAPI_CLIENT_ID}/notifications`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${btoa(NOTIFICATIONAPI_CLIENT_ID + ":" + NOTIFICATIONAPI_CLIENT_SECRET)}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  notificationId: "renewal_reminder",
                  user: {
                    id: sub.id,
                    number: sub.phone_number,
                  },
                  mergeTags: {
                    subject: `${sub.name} 결제일 알림`,
                    body: `${sub.name} 구독이 ${sub.renewal_date}에 갱신됩니다. 금액: ${sub.amount} ${sub.currency}`,
                  },
                }),
              }
            );

            const smsData = await smsRes.text();
            await supabase.from("notification_logs").insert({
              subscription_id: sub.id,
              subscription_name: sub.name,
              channel: "sms",
              status: smsRes.ok ? "success" : "failed",
              recipient: sub.phone_number,
              error_message: smsRes.ok ? null : smsData,
              test_run: false,
            });
          } catch (e) {
            await supabase.from("notification_logs").insert({
              subscription_id: sub.id,
              subscription_name: sub.name,
              channel: "sms",
              status: "failed",
              recipient: sub.phone_number,
              error_message: String(e),
              test_run: false,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: TEST_MODE ? "test" : "live",
        date: todayStr,
        results,
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
