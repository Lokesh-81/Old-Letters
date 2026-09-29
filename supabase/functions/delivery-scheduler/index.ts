// Supabase Edge Function: delivery-scheduler
// Invoked via cron or webhook to transition due letters from SCHEDULED -> DELIVERED
// Sends branded email notifications via Resend.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "post@old-letters.in";
    const appUrl = Deno.env.get("APP_URL") ?? "https://oldletters.vercel.app";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials in Edge Function environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find letters due for delivery
    const nowUtc = new Date().toISOString();
    const { data: dueLetters, error: fetchErr } = await supabase
      .from("letters")
      .select(`
        id,
        tracking_code,
        delivery_date,
        sender_id,
        letter_recipients (
          id,
          email,
          display_name
        ),
        profiles:sender_id (
          full_name
        )
      `)
      .eq("status", "SCHEDULED")
      .lte("delivery_date", nowUtc)
      .limit(50);

    if (fetchErr) {
      throw fetchErr;
    }

    const processedLetters = [];

    for (const letter of dueLetters ?? []) {
      const recipient = Array.isArray(letter.letter_recipients)
        ? letter.letter_recipients[0]
        : letter.letter_recipients;

      if (!recipient || !recipient.email) {
        continue;
      }

      // Generate a cryptographically random delivery token (32 bytes hex)
      const rawTokenBytes = new Uint8Array(32);
      crypto.getRandomValues(rawTokenBytes);
      const rawToken = Array.from(rawTokenBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Calculate SHA-256 hash to store in DB
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(rawToken)
      );
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Calculate 30-day token expiry
      const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      // In a transaction / sequential state updates:
      // a. Insert delivery_token
      await supabase.from("delivery_tokens").insert({
        letter_id: letter.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      // b. Update letter status to DELIVERED (idempotent guard)
      const { error: updateErr } = await supabase
        .from("letters")
        .update({
          status: "DELIVERED",
          delivered_at: nowUtc,
          updated_at: nowUtc,
        })
        .eq("id", letter.id)
        .eq("status", "SCHEDULED"); // Optimistic concurrency check

      if (updateErr) {
        console.error(`Letter ${letter.id} update skipped:`, updateErr);
        continue;
      }

      // c. Insert delivery event
      await supabase.from("delivery_events").insert({
        letter_id: letter.id,
        event_type: "LETTER_DELIVERED",
        metadata: {
          delivered_at: nowUtc,
          recipient_email: recipient.email,
        },
      });

      // d. Send delivery email via Resend
      const deliveryUrl = `${appUrl}/letter/${rawToken}`;
      const senderDisplayName =
        (letter.profiles as any)?.full_name || "A correspondent";

      if (resendApiKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `OLD-LETTERS <${resendFromEmail}>`,
            to: [recipient.email],
            subject: `Your letter has arrived — OLD-LETTERS`,
            html: `
              <div style="background-color: #faf9f7; padding: 48px 24px; font-family: serif; color: #134e4a; text-align: center;">
                <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 40px 32px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                  <div style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #78716c; margin-bottom: 16px; font-family: monospace;">
                    DISPATCH REF: ${letter.tracking_code}
                  </div>
                  <h1 style="font-size: 32px; font-weight: 300; margin: 0 0 16px 0; color: #134e4a;">
                    A letter has arrived.
                  </h1>
                  <p style="font-style: italic; font-size: 18px; color: #44403c; margin: 0 0 24px 0;">
                    Your letter is waiting for you.
                  </p>
                  <p style="font-size: 14px; font-family: sans-serif; color: #57534e; line-height: 1.6; margin-bottom: 32px;">
                    Sent with care by ${senderDisplayName}. The appointed waiting duration has elapsed, and the sealed envelope is ready for your eyes.
                  </p>
                  <a href="${deliveryUrl}" style="display: inline-block; background-color: #134e4a; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 12px; font-family: sans-serif; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px;">
                    OPEN YOUR LETTER →
                  </a>
                  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eae4da; font-size: 11px; color: #a8a29e; font-family: monospace;">
                    OLD-LETTERS · SOME THINGS ARE WORTH WAITING FOR
                  </div>
                </div>
              </div>
            `,
          }),
        });

        if (emailRes.ok) {
          await supabase.from("delivery_events").insert({
            letter_id: letter.id,
            event_type: "RECIPIENT_EMAIL_SENT",
            metadata: {
              recipient_email: recipient.email,
              sent_at: nowUtc,
            },
          });
        }
      }

      processedLetters.push({
        letterId: letter.id,
        trackingCode: letter.tracking_code,
        recipient: recipient.email,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        deliveredCount: processedLetters.length,
        processed: processedLetters,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
