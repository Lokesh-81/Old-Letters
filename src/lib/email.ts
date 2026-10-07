/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OLD-LETTERS Central Mailroom Service
 * Gmail SMTP Transactional Email Dispatcher via Nodemailer
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export const SENDER_EMAIL = 'oldletters.mailroom@gmail.com';
export const SENDER_NAME = 'OLD-LETTERS';
export const SENDER_FORMATTED = `"${SENDER_NAME}" <${SENDER_EMAIL}>`;

let transporterInstance: Transporter | null = null;

/**
 * Checks if Gmail SMTP credentials are configured in environment variables.
 */
export function isEmailConfigured(): boolean {
  const user = process.env.SMTP_USER?.trim() || SENDER_EMAIL;
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(user && pass);
}

/**
 * Returns a singleton Nodemailer transporter configured for Gmail SMTP.
 * Never recreates transports across invocations if one is already active.
 */
export function getTransporter(): Transporter | null {
  const pass = process.env.SMTP_PASS?.trim();
  if (!pass) {
    return null;
  }

  if (transporterInstance) {
    return transporterInstance;
  }

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT?.trim() || '465', 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE.trim() === 'true' : port === 465;
  const user = process.env.SMTP_USER?.trim() || SENDER_EMAIL;

  try {
    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      // Keep serverless memory footprint low
      maxConnections: 1,
      pool: false,
    });
    return transporterInstance;
  } catch (err: any) {
    const safeError = err && typeof err.message === 'string' ? err.message : 'Failed to initialize SMTP transporter';
    console.error('[OLD-LETTERS Mailroom] Transporter initialization error:', safeError);
    return null;
  }
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailLogEntry {
  type: string;
  to: string;
  letterId?: string;
  paymentId?: string;
  dispatchRef?: string;
  status: 'SENT' | 'FAILED';
  error?: string;
  timestamp?: string;
}

/**
 * Structured logger for OLD-LETTERS transactional mailings.
 * Never logs letter body, OTP plaintext, passwords, API keys, or private secrets.
 */
export function logEmailDispatch(entry: EmailLogEntry): void {
  const ts = entry.timestamp || new Date().toISOString();
  console.log(`[OLD-LETTERS EMAIL DISPATCH]
event: ${entry.type}
recipient: ${entry.to}
paymentId: ${entry.paymentId || entry.dispatchRef || 'N/A'}
letterId: ${entry.letterId || 'N/A'}
timestamp: ${ts}
status: ${entry.status}${entry.error ? `\nprovider error: ${entry.error}` : ''}`);
}

/**
 * Sends a transactional email through Gmail SMTP.
 * Always awaited for serverless execution guarantees.
 * Never prints passwords or secrets to logs.
 */
export async function sendMail(
  options: SendMailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = getTransporter();

  if (!transporter) {
    // When SMTP credentials are not configured (local development or test runs),
    // simulate successful postal queueing so tests and development flow reliably.
    const simMessageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[OLD-LETTERS Mailroom] Notice: Gmail SMTP not configured. Simulated dispatch to ${options.to}. Subject: "${options.subject}" (ID: ${simMessageId})`);
    return {
      success: true,
      messageId: simMessageId,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: SENDER_FORMATTED,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
      replyTo: options.replyTo || SENDER_EMAIL,
    });

    console.log(`[OLD-LETTERS Mailroom] Email successfully dispatched to ${options.to}. Subject: "${options.subject}" (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    // Sanitized logging without exposing credentials or internal states
    const safeMessage = err && typeof err.message === 'string' ? err.message : 'Unknown SMTP transmission error';
    console.error(`[OLD-LETTERS Mailroom] SMTP delivery error to ${options.to}:`, safeMessage);
    return { success: false, error: safeMessage };
  }
}

// ====================================================================
// OLD-LETTERS LUXURY POSTAL EMAIL TEMPLATES
// ====================================================================

export const PRODUCTION_DOMAIN = 'https://oldletters.vercel.app';
export const EMAIL_LOGO_URL = `${PRODUCTION_DOMAIN}/logo.png`;
export const EMAIL_FAVICON_URL = `${PRODUCTION_DOMAIN}/favicon.png`;

function emailWrapper(title: string, subtitle: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #292524; -webkit-font-smoothing: antialiased; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F7F5F0; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Content Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #EAE4DA; border-radius: 3px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); overflow: hidden;">
          
          <!-- Editorial Brand Header with Official Horizontal Logo -->
          <tr>
            <td align="center" style="padding: 36px 32px 24px 32px; border-bottom: 1px solid #F0ECE4; background-color: #FFFFFF;">
              <a href="${PRODUCTION_DOMAIN}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                <img
                  src="${EMAIL_LOGO_URL}"
                  alt="OLD-LETTERS"
                  width="200"
                  height="67"
                  style="display: block; width: 200px; max-width: 200px; height: auto; border: 0; outline: none; margin: 0 auto; object-fit: contain;"
                />
              </a>
              <span style="display: block; font-size: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.24em; color: #78716C; text-transform: uppercase; margin-top: 12px;">
                Central Correspondence Bureau
              </span>
            </td>
          </tr>

          <!-- Docket & Subject Heading -->
          <tr>
            <td style="padding: 28px 36px 12px 36px; text-align: center;">
              ${subtitle ? `
              <div style="margin-bottom: 14px;">
                <span style="display: inline-block; font-size: 10px; font-family: 'Courier New', Courier, monospace; letter-spacing: 0.22em; text-transform: uppercase; color: #57534E; background-color: #F7F5F0; padding: 5px 14px; border-radius: 2px; border: 1px solid #EAE4DA;">
                  ${subtitle}
                </span>
              </div>` : ''}
              <h1 style="font-family: 'Times New Roman', Georgia, serif; font-size: 24px; font-weight: normal; color: #134E4A; margin: 0; line-height: 1.35; letter-spacing: 0.02em;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Editorial Body Surface -->
          <tr>
            <td style="padding: 16px 36px 36px 36px; font-size: 14px; line-height: 1.75; color: #33302C;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Refined Postal Footer with Standalone Favicon Mark -->
          <tr>
            <td style="padding: 24px 36px; background-color: #FAF9F7; border-top: 1px solid #EAE4DA; text-align: center;">
              <div style="margin-bottom: 10px;">
                <img
                  src="${EMAIL_FAVICON_URL}"
                  alt="OLD-LETTERS Seal"
                  width="20"
                  height="20"
                  style="display: inline-block; vertical-align: middle; border: 0; outline: none; width: 20px; height: 20px; object-fit: contain;"
                />
              </div>
              <div style="font-family: 'Times New Roman', Georgia, serif; font-style: italic; font-size: 13px; color: #57534E; margin-bottom: 6px;">
                &ldquo;Some things are worth waiting for.&rdquo;
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #A8A29E;">
                Held in Archival Trust · Central Postal Vault
              </div>
              <div style="margin-top: 10px;">
                <a href="${PRODUCTION_DOMAIN}" target="_blank" rel="noopener noreferrer" style="font-size: 10px; color: #78716C; text-decoration: underline; font-family: monospace;">
                  ${PRODUCTION_DOMAIN.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 1A. SENDER DISPATCH CONFIRMATION (T+0)
 */
export async function sendLetterDispatchedSenderEmail(params: {
  senderEmail: string;
  senderName: string;
  recipientName: string;
  trackingCode: string;
  letterType: string;
  scheduledArrivalFormatted: string;
  waitingHours: number;
  archiveUrl: string;
}) {
  const subject = 'Your letter has been dispatched · OLD-LETTERS';
  const html = emailWrapper(
    'Your letter has been dispatched',
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.senderName},</p>
      <p>
        Your correspondence to <strong>${params.recipientName}</strong> has been sealed with ceremony and entrusted to the OLD-LETTERS archival vault.
      </p>
      <div style="background-color: #f7f6f2; border-left: 3px solid #134e4a; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 12px; font-family: monospace;">
          <tr>
            <td style="color: #78716c; width: 40%;">RECIPIENT:</td>
            <td style="color: #141618; font-weight: bold;">${params.recipientName}</td>
          </tr>
          <tr>
            <td style="color: #78716c;">DISPATCH REF:</td>
            <td style="color: #141618; font-weight: bold;">${params.trackingCode}</td>
          </tr>
          <tr>
            <td style="color: #78716c;">CORRESPONDENCE:</td>
            <td style="color: #141618;">${params.letterType}</td>
          </tr>
          <tr>
            <td style="color: #78716c;">EXPECTED ARRIVAL:</td>
            <td style="color: #134e4a; font-weight: bold;">${params.scheduledArrivalFormatted}</td>
          </tr>
          <tr>
            <td style="color: #78716c;">WAITING PERIOD:</td>
            <td style="color: #141618;">${params.waitingHours} hours (Intentional Transit)</td>
          </tr>
        </table>
      </div>
      <p style="font-size: 13px; color: #57534e; font-style: italic;">
        &ldquo;Your letter has been sealed and entrusted to the OLD-LETTERS archive. It will remain sealed for ${params.waitingHours} hours before it becomes available to the recipient.&rdquo;
      </p>
      <p style="font-size: 13px; color: #57534e;">
        Private recipient access is secured. Neither sender nor recipient may bypass the intentional waiting period until the appointed hour arrives.
      </p>
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${params.archiveUrl}" style="background-color: #134e4a; color: #ffffff; padding: 12px 26px; font-size: 11px; text-decoration: none; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          VIEW DISPATCH ARCHIVE →
        </a>
      </div>
    `
  );

  return sendMail({
    to: params.senderEmail,
    subject,
    html,
    text: `Your letter to ${params.recipientName} has been dispatched (Ref: ${params.trackingCode}). Scheduled arrival: ${params.scheduledArrivalFormatted}. It will remain sealed for ${params.waitingHours} hours.`,
  });
}

/**
 * 1B. RECIPIENT DISPATCH NOTICE (T+0)
 */
export async function sendLetterDispatchedRecipientEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  trackingCode: string;
  scheduledArrivalFormatted: string;
  waitingHours: number;
  recipientUrl: string;
}) {
  const subject = 'Someone has sent you a letter · OLD-LETTERS';
  const html = emailWrapper(
    'Someone has sent you a letter',
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.recipientName},</p>
      <p>
        Someone (${params.senderName ? `<strong>${params.senderName}</strong>` : 'A sender'}) has sent you a private letter through <strong>OLD-LETTERS</strong>.
      </p>
      <p>
        The letter has been sealed in wax and is currently in transit. In keeping with the tradition of mindful correspondence, it is intentionally unavailable until the appointed arrival time.
      </p>
      <div style="background-color: #f7f6f2; border: 1px solid #eae4da; padding: 18px; margin: 20px 0; text-align: center; border-radius: 4px;">
        <span style="font-size: 11px; font-family: monospace; letter-spacing: 0.2em; text-transform: uppercase; color: #78716c; display: block; margin-bottom: 6px;">
          APPOINTED ARRIVAL TIME
        </span>
        <span style="font-size: 17px; font-family: serif; color: #134e4a; font-weight: bold; display: block;">
          ${params.scheduledArrivalFormatted}
        </span>
        <span style="font-size: 12px; color: #78716c; display: block; margin-top: 6px;">
          (${params.waitingHours} hours intentional waiting period)
        </span>
      </div>
      <p style="font-size: 13px; color: #57534e;">
        You will receive another notification when the letter is ready to be opened. For your privacy, recipient verification will be required before unsealing.
      </p>
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${params.recipientUrl}" style="background-color: #134e4a; color: #ffffff; padding: 12px 26px; font-size: 11px; text-decoration: none; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          VIEW TRANSIT COUNTDOWN →
        </a>
      </div>
      <p style="font-size: 11px; color: #a8a29e; text-align: center; margin-top: 14px;">
        Note: Opening this link before arrival will show the sealed in-transit vault. The seal cannot be broken prematurely.
      </p>
    `
  );

  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Someone has sent you a letter through OLD-LETTERS (Ref: ${params.trackingCode}). It is currently in transit and scheduled to arrive on ${params.scheduledArrivalFormatted}. Track status: ${params.recipientUrl}`,
  });
}

/**
 * 2A. SENDER 24-HOUR HALFWAY UPDATE (T+24h)
 */
export async function sendHalfwaySenderEmail(params: {
  senderEmail: string;
  senderName: string;
  recipientName: string;
  trackingCode: string;
  scheduledArrivalFormatted: string;
  archiveUrl: string;
}) {
  const subject = 'Your letter is still in transit · OLD-LETTERS';
  const html = emailWrapper(
    'Your letter is still in transit',
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.senderName},</p>
      <p>
        Your correspondence to <strong>${params.recipientName}</strong> has completed 24 hours of its intentional journey.
      </p>
      <div style="background-color: #f7f6f2; border-left: 3px solid #134e4a; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 12px;">
        <div style="margin-bottom: 4px;"><strong>STATUS:</strong> <span style="color: #134e4a;">SEALED / IN TRANSIT</span></div>
        <div style="margin-bottom: 4px;"><strong>REMAINING:</strong> Approximately 24 hours</div>
        <div><strong>EXPECTED ARRIVAL:</strong> ${params.scheduledArrivalFormatted}</div>
      </div>
      <p style="font-size: 13px; color: #57534e;">
        Your words remain untouched and secured in the archival vault, waiting for the appointed hour when the seal may be broken.
      </p>
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${params.archiveUrl}" style="background-color: #134e4a; color: #ffffff; padding: 12px 26px; font-size: 11px; text-decoration: none; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          VIEW CORRESPONDENCE STATUS →
        </a>
      </div>
    `
  );

  return sendMail({
    to: params.senderEmail,
    subject,
    html,
    text: `Your letter to ${params.recipientName} (Ref: ${params.trackingCode}) is still in transit. Approximately 24 hours remaining until arrival on ${params.scheduledArrivalFormatted}.`,
  });
}

/**
 * 2B. RECIPIENT 24-HOUR HALFWAY UPDATE (T+24h)
 */
export async function sendHalfwayRecipientEmail(params: {
  recipientEmail: string;
  recipientName: string;
  trackingCode: string;
  scheduledArrivalFormatted: string;
  recipientUrl: string;
}) {
  const subject = 'Your letter is still in transit · OLD-LETTERS';
  const html = emailWrapper(
    'Your letter is still in transit',
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.recipientName},</p>
      <p>
        The letter dispatched for you is halfway through its journey through the correspondence vault.
      </p>
      <div style="background-color: #f7f6f2; border: 1px solid #eae4da; padding: 16px; margin: 20px 0; border-radius: 4px; font-family: monospace; font-size: 12px; text-align: center;">
        <div style="color: #78716c; margin-bottom: 4px;">CURRENT STATUS</div>
        <div style="color: #134e4a; font-weight: bold; font-size: 14px; margin-bottom: 8px;">SEALED / IN TRANSIT</div>
        <div style="color: #44403c;">Approximately 24 hours remaining</div>
        <div style="color: #78716c; font-size: 11px; margin-top: 4px;">Arriving: ${params.scheduledArrivalFormatted}</div>
      </div>
      <p style="font-size: 13px; color: #57534e;">
        In an era of instant messages, some words need time to travel. Your letter remains protected and will be made accessible at the appointed hour.
      </p>
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${params.recipientUrl}" style="background-color: #134e4a; color: #ffffff; padding: 12px 26px; font-size: 11px; text-decoration: none; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          VIEW TRANSIT COUNTDOWN →
        </a>
      </div>
    `
  );

  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Your letter (Ref: ${params.trackingCode}) is still in transit. Approximately 24 hours remaining until arrival on ${params.scheduledArrivalFormatted}. Track: ${params.recipientUrl}`,
  });
}

/**
 * 3. 30 MINUTES BEFORE ARRIVAL — RECIPIENT OTP (T+47.5h)
 */
export async function sendPreArrivalOtpRecipientEmail(params: {
  recipientEmail: string;
  recipientName: string;
  trackingCode: string;
  otpCode: string;
  scheduledArrivalFormatted: string;
  recipientUrl: string;
}) {
  const subject = 'Your letter will arrive shortly · Verification required';
  const html = emailWrapper(
    'Your letter will arrive shortly · Verification required',
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.recipientName},</p>
      <p>
        Your incoming letter has nearly completed its 48-hour journey and will become available in approximately <strong>30 minutes</strong> (${params.scheduledArrivalFormatted}).
      </p>
      <p>
        To ensure this private correspondence is unsealed only by you, please use the following one-time verification code when the letter arrives:
      </p>
      <div style="background-color: #faf9f7; border: 2px dashed #134e4a; padding: 20px; margin: 24px 0; text-align: center; border-radius: 4px;">
        <span style="font-size: 11px; font-family: monospace; letter-spacing: 0.25em; text-transform: uppercase; color: #78716c; display: block; margin-bottom: 8px;">
          RECIPIENT VERIFICATION CODE
        </span>
        <span style="font-size: 36px; font-family: monospace, Courier; font-weight: bold; letter-spacing: 0.3em; color: #134e4a; display: block;">
          ${params.otpCode}
        </span>
        <span style="font-size: 11px; color: #78716c; display: block; margin-top: 8px;">
          Activates upon arrival at ${params.scheduledArrivalFormatted}
        </span>
      </div>
      <p style="font-size: 13px; color: #57534e;">
        The letter remains sealed in the vault for the next 30 minutes. Once the arrival time is reached, enter this code at the private recipient link below to unseal your correspondence.
      </p>
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${params.recipientUrl}" style="background-color: #134e4a; color: #ffffff; padding: 12px 26px; font-size: 11px; text-decoration: none; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          GO TO LETTER ARRIVAL VAULT →
        </a>
      </div>
    `
  );

  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Your letter (Ref: ${params.trackingCode}) will arrive in approximately 30 minutes at ${params.scheduledArrivalFormatted}. Your verification code is ${params.otpCode}. Open letter: ${params.recipientUrl}`,
  });
}

/**
 * 4. EXACTLY AFTER 48 HOURS — ARRIVAL NOTIFICATION (T+48h)
 */
export async function sendArrivalRecipientEmail(params: {
  recipientEmail: string;
  recipientName: string;
  trackingCode: string;
  arrivalFormatted: string;
  recipientUrl: string;
  requiresOtp?: boolean;
  hasApprovedMedia?: boolean;
  mediaType?: 'VOICE' | 'VIDEO';
}) {
  const subject = 'Your letter has arrived · OLD-LETTERS';
  const enclosureNoticeHtml = params.hasApprovedMedia
    ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; margin: 18px 0; border-radius: 4px; text-align: center;">
        <span style="font-size: 13px; color: #166534; font-family: serif; font-weight: bold; display: block;">
          ✦ Your personal message enclosure is now available.
        </span>
      </div>`
    : '';

  const html = emailWrapper(
    'Your Letter Has Arrived · OLD-LETTERS',
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.recipientName},</p>
      <p style="font-size: 16px; color: #134e4a; font-family: serif; font-style: italic;">
        Your letter has arrived. The 48-hour wait is complete. The seal may now be broken.
      </p>
      <p>
        Your correspondence has completed its journey and is ready to be unsealed.
      </p>
      ${enclosureNoticeHtml}
      <div style="background-color: #f7f6f2; border: 1px solid #eae4da; padding: 18px; margin: 22px 0; border-radius: 4px; text-align: center;">
        <span style="font-size: 11px; font-family: monospace; letter-spacing: 0.2em; text-transform: uppercase; color: #78716c; display: block; margin-bottom: 6px;">
          CORRESPONDENCE STATUS
        </span>
        <span style="font-size: 18px; font-family: serif; color: #047857; font-weight: bold; display: block;">
          DELIVERED · READY TO OPEN
        </span>
        <span style="font-size: 11px; color: #78716c; display: block; margin-top: 4px;">
          Completed at ${params.arrivalFormatted}
        </span>
      </div>
      <p style="font-size: 13px; color: #57534e;">
        Verify your recipient access and open your letter. ${params.requiresOtp ? 'Please enter the verification code sent to your email to break the wax seal.' : ''}
      </p>
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${params.recipientUrl}" style="background-color: #134e4a; color: #ffffff; padding: 14px 32px; font-size: 12px; text-decoration: none; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          READ YOUR DELIVERED LETTER →
        </a>
      </div>
    `
  );

  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Your letter (Ref: ${params.trackingCode}) has arrived! The 48-hour wait is complete.${params.hasApprovedMedia ? '\n\nYour personal message enclosure is now available.' : ''}\n\nRead your delivered letter now: ${params.recipientUrl}`,
  });
}

/**
 * 5. PAYMENT SUBMITTED NOTIFICATION (TO SENDER ONLY)
 */
export async function sendPaymentSubmittedSenderEmail(params: {
  senderEmail: string;
  senderName: string;
  paymentId: string;
  upiReference: string;
  amount: number;
  currency?: string;
  mediaType: 'VOICE' | 'VIDEO';
  recipientName?: string;
  letterReference?: string;
}) {
  const subject = 'OLD-LETTERS — Payment Submitted for Verification';
  const currency = params.currency || 'INR';
  const mediaLabel = params.mediaType === 'VIDEO' ? 'Video Message Enclosure' : 'Voice Message Enclosure';

  const html = emailWrapper(
    'Payment Submitted for Verification · OLD-LETTERS',
    `PAYMENT REF: ${params.paymentId}`,
    `
      <p style="margin-top: 0;">Dear ${params.senderName || 'Correspondent'},</p>
      <p>
        Your payment reference has been submitted to the Central Correspondence Bureau and is currently awaiting administrative verification.
      </p>
      <div style="background-color: #f7f6f2; border-left: 3px solid #0d9488; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 12px;">
        <div style="margin-bottom: 4px;"><strong>PAYMENT ID:</strong> ${params.paymentId}</div>
        <div style="margin-bottom: 4px;"><strong>UPI UTR REF:</strong> ${params.upiReference}</div>
        <div style="margin-bottom: 4px;"><strong>AMOUNT:</strong> ₹${params.amount} ${currency}</div>
        <div style="margin-bottom: 4px;"><strong>SELECTION:</strong> ${mediaLabel}</div>
        ${params.recipientName ? `<div style="margin-bottom: 4px;"><strong>RECIPIENT:</strong> ${params.recipientName}</div>` : ''}
        ${params.letterReference ? `<div style="margin-bottom: 4px;"><strong>LETTER REF:</strong> ${params.letterReference}</div>` : ''}
        <div><strong>STATUS:</strong> <span style="color: #d97706; font-weight: bold;">PENDING VERIFICATION</span></div>
      </div>
      <p style="font-size: 13px; color: #57534e;">
        Our bureau staff verifies each UPI reference against our postal bank statement. Once verified, your ${mediaLabel.toLowerCase()} will be approved to accompany your sealed correspondence upon arrival.
      </p>
    `
  );

  return sendMail({
    to: params.senderEmail,
    subject,
    html,
    text: `OLD-LETTERS — Payment Submitted for Verification\n\nPayment ID: ${params.paymentId}\nUTR: ${params.upiReference}\nAmount: ₹${params.amount} ${currency}\nSelection: ${mediaLabel}\nStatus: Pending Verification\n\nOur bureau staff will verify your payment against our postal bank records.`,
  });
}

/**
 * 6A. ADMIN PAYMENT CONFIRMED EMAIL (TO SENDER)
 */
export async function sendPaymentApprovedEmail(params: {
  userEmail: string;
  orderReference: string;
  amount: number;
  currency?: string;
  upiReference?: string;
  mediaType?: 'VOICE' | 'VIDEO';
  featureName?: string;
  adminNote?: string;
  statusUrl?: string;
}) {
  const subject = 'OLD-LETTERS — Payment Verified';
  const currency = params.currency || 'INR';
  const mediaLabel = params.mediaType === 'VIDEO' ? 'Video Message Enclosure' : 'Voice Message Enclosure';

  const html = emailWrapper(
    'Payment Verified · OLD-LETTERS',
    `PAYMENT REF: ${params.orderReference}`,
    `
      <p style="margin-top: 0;">Greetings,</p>
      <p>
        Your payment reference for <strong>${params.featureName || mediaLabel}</strong> has been verified and approved by the central correspondence bureau administrator.
      </p>
      <div style="background-color: #f7f6f2; border-left: 3px solid #047857; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 12px;">
        <div style="margin-bottom: 4px;"><strong>PAYMENT ID:</strong> ${params.orderReference}</div>
        ${params.upiReference ? `<div style="margin-bottom: 4px;"><strong>UPI UTR:</strong> ${params.upiReference}</div>` : ''}
        <div style="margin-bottom: 4px;"><strong>AMOUNT:</strong> ₹${params.amount} ${currency}</div>
        <div style="margin-bottom: 4px;"><strong>ENCLOSURE:</strong> ${params.featureName || mediaLabel}</div>
        <div><strong>STATUS:</strong> <span style="color: #047857; font-weight: bold;">APPROVED</span></div>
      </div>
      ${params.adminNote ? `<p style="font-size: 13px; color: #57534e; font-style: italic;">Bureau Note: &ldquo;${params.adminNote}&rdquo;</p>` : ''}
      <p style="font-size: 13px; color: #57534e;">
        Your personal voice/video message enclosure has been verified and will accompany your letter upon delivery.
      </p>
    `
  );

  return sendMail({
    to: params.userEmail,
    subject,
    html,
    text: `OLD-LETTERS — Payment Verified\n\nPayment ID: ${params.orderReference}\nAmount: ₹${params.amount} ${currency}\n${params.upiReference ? `UTR: ${params.upiReference}\n` : ''}Status: APPROVED\nPersonal Message Type: ${params.featureName || mediaLabel}\n\nYour personal voice/video enclosure will accompany your letter upon delivery.`,
  });
}

/**
 * 6B. ADMIN PAYMENT ISSUE / REJECTION EMAIL (TO SENDER)
 */
export async function sendPaymentIssueEmail(params: {
  userEmail: string;
  orderReference: string;
  amount: number;
  currency?: string;
  upiReference?: string;
  adminNote?: string;
  contactUrl?: string;
}) {
  const subject = 'OLD-LETTERS — Payment Verification Failed';
  const currency = params.currency || 'INR';

  const html = emailWrapper(
    'Payment Verification Failed · OLD-LETTERS',
    `PAYMENT REF: ${params.orderReference}`,
    `
      <p style="margin-top: 0;">Greetings,</p>
      <p>
        Your payment reference could not be verified. The UPI / UTR transaction details provided could not be confirmed with our correspondence registry.
      </p>
      <div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0; font-size: 13px; color: #991b1b; font-family: monospace;">
        <div style="margin-bottom: 4px;"><strong>PAYMENT ID:</strong> ${params.orderReference}</div>
        ${params.upiReference ? `<div style="margin-bottom: 4px;"><strong>UPI UTR:</strong> ${params.upiReference}</div>` : ''}
        <div style="margin-bottom: 4px;"><strong>AMOUNT:</strong> ₹${params.amount} ${currency}</div>
        <div style="margin-bottom: 4px;"><strong>STATUS:</strong> <span style="font-weight: bold;">VERIFICATION FAILED (REJECTED)</span></div>
        ${params.adminNote ? `<div style="margin-top: 6px;"><strong>ADMIN NOTE:</strong> ${params.adminNote}</div>` : ''}
      </div>
      <p style="font-size: 13px; color: #44403c; font-weight: 600;">
        Important: Your letter will be dispatched and delivered as scheduled, but the personal voice/video enclosure will NOT accompany the letter upon arrival.
      </p>
      <p style="font-size: 13px; color: #57534e;">
        If you believe this was an error, please contact the Correspondence Office with proof of transaction.
      </p>
    `
  );

  return sendMail({
    to: params.userEmail,
    subject,
    html,
    text: `OLD-LETTERS — Payment Verification Failed\n\nYour payment reference could not be verified. The UPI / UTR transaction details provided could not be confirmed.\n\nPayment ID: ${params.orderReference}\nAmount: ₹${params.amount} ${currency}\n${params.upiReference ? `UTR: ${params.upiReference}\n` : ''}Status: REJECTED\n${params.adminNote ? `Reason: ${params.adminNote}\n` : ''}\nImportant: Your letter will continue and be delivered as scheduled, but the personal voice/video enclosure will NOT accompany the letter upon arrival.`,
  });
}
