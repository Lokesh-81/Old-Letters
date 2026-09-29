// Supabase Edge Function: recipient-verification
// Handles recipient authentication (Gmail OTP or Secret Passphrase) for sealed letters.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "post@old-letters.in";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { action, token, otp, passphrase } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing delivery token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash token to look up delivery record
    const tokenHash = await sha256(token);
    const { data: tokenRecord, error: tokenErr } = await supabase
      .from("delivery_tokens")
      .select("*, letters(*, letter_recipients(*), letter_media(*))")
      .eq("token_hash", tokenHash)
      .single();

    if (tokenErr || !tokenRecord) {
      return new Response(JSON.stringify({ error: "Invalid or expired letter link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const letter = tokenRecord.letters;
    const recipient = letter.letter_recipients?.[0];

    // 1. GET METADATA (without revealing letter body or secret before verification)
    if (action === "get_meta") {
      return new Response(
        JSON.stringify({
          trackingCode: letter.tracking_code,
          verificationMethod: letter.recipient_verification_method,
          recipientEmailMasked: recipient?.email ? recipient.email.replace(/(?<=.).(?=.*@)/g, "*") : "",
          senderName: "Your Correspondent",
          isDelivered: letter.status === "DELIVERED" || letter.status === "OPENED" || letter.status === "COMPLETED",
          status: letter.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. REQUEST OTP
    if (action === "request_otp") {
      if (letter.recipient_verification_method !== "otp") {
        return new Response(JSON.stringify({ error: "This letter does not require OTP verification." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate 6-digit numeric code securely
      const randomValues = new Uint32Array(1);
      crypto.getRandomValues(randomValues);
      const otpCode = String(100000 + (randomValues[0] % 900000));
      const otpHash = await sha256(otpCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Invalidate previous OTPs for this letter
      await supabase
        .from("otp_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("letter_id", letter.id)
        .is("used_at", null);

      // Insert new OTP
      await supabase.from("otp_codes").insert({
        letter_id: letter.id,
        email: recipient.email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempt_count: 0,
      });

      // Send OTP via Resend
      if (resendApiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `OLD-LETTERS <${resendFromEmail}>`,
            to: [recipient.email],
            subject: `Your Verification Code — OLD-LETTERS`,
            html: `
              <div style="background-color: #faf9f7; padding: 40px; font-family: serif; color: #134e4a; text-align: center;">
                <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 36px; border-radius: 4px;">
                  <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #78716c; margin-bottom: 12px; font-family: monospace;">
                    PRIVATE CORRESPONDENCE VERIFICATION
                  </div>
                  <h2 style="font-size: 26px; font-weight: 300; margin: 0 0 16px 0;">Verify Your Access</h2>
                  <p style="font-size: 14px; font-family: sans-serif; color: #57534e; margin-bottom: 24px;">
                    Enter the code below to unseal your incoming letter. This code is valid for 10 minutes.
                  </p>
                  <div style="font-size: 36px; font-family: monospace; letter-spacing: 0.25em; font-weight: bold; background: #faf9f7; padding: 16px; border: 1px dashed #134e4a; color: #134e4a; margin: 24px 0;">
                    ${otpCode}
                  </div>
                  <div style="font-size: 11px; color: #a8a29e; font-family: monospace;">
                    If you did not expect a letter, you can safely disregard this message.
                  </div>
                </div>
              </div>
            `,
          }),
        });
      }

      return new Response(JSON.stringify({ success: true, message: "OTP sent to recipient email." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. VERIFY OTP OR PASSPHRASE
    let verified = false;

    if (letter.recipient_verification_method === "open") {
      verified = true;
    } else if (letter.recipient_verification_method === "otp") {
      const { data: activeOtp } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("letter_id", letter.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!activeOtp || new Date(activeOtp.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Code expired or not found. Please request a new one." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (activeOtp.attempt_count >= 5) {
        return new Response(JSON.stringify({ error: "Too many failed attempts. Verification locked." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const inputOtpHash = await sha256(String(otp || "").trim());
      if (inputOtpHash === activeOtp.otp_hash) {
        verified = true;
        await supabase
          .from("otp_codes")
          .update({ used_at: new Date().toISOString() })
          .eq("id", activeOtp.id);
      } else {
        await supabase
          .from("otp_codes")
          .update({ attempt_count: activeOtp.attempt_count + 1 })
          .eq("id", activeOtp.id);

        return new Response(JSON.stringify({ error: "Incorrect verification code." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (letter.recipient_verification_method === "passphrase") {
      const inputPassphraseHash = await sha256(String(passphrase || "").trim());
      if (inputPassphraseHash === letter.secret_passphrase_hash) {
        verified = true;
      } else {
        return new Response(JSON.stringify({ error: "Incorrect cipher passphrase." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (verified) {
      // Mark as OPENED if first time
      if (letter.status === "DELIVERED") {
        await supabase
          .from("letters")
          .update({
            status: "OPENED",
            opened_at: new Date().toISOString(),
          })
          .eq("id", letter.id);

        await supabase.from("delivery_events").insert({
          letter_id: letter.id,
          event_type: "LETTER_OPENED",
          metadata: { opened_at: new Date().toISOString() },
        });
      }

      // Check for unlocked paid features
      const { data: unlockedFeatures } = await supabase
        .from("paid_features")
        .select("feature_code, status")
        .eq("letter_id", letter.id)
        .eq("status", "UNLOCKED");

      return new Response(
        JSON.stringify({
          success: true,
          letter: {
            id: letter.id,
            trackingCode: letter.tracking_code,
            type: letter.letter_type,
            templateId: letter.template_id || "ivory",
            greeting: letter.salutation,
            content: letter.body,
            signoff: letter.signoff,
            letterDate: letter.posted_at ? new Date(letter.posted_at).toLocaleDateString() : new Date().toLocaleDateString(),
            attachments: (letter.letter_media || []).map((m: any) => ({
              id: m.id,
              type: m.media_type,
              url: m.storage_path,
              caption: m.caption,
            })),
            paidFeatures: (unlockedFeatures || []).map((f: any) => f.feature_code),
            status: letter.status,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unauthorized access" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
