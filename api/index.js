// server.ts
import express from "express";
import fs from "fs";
import crypto2 from "crypto";
import dotenv2 from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// src/lib/email.ts
import nodemailer from "nodemailer";
var SENDER_EMAIL = "oldletters.mailroom@gmail.com";
var SENDER_NAME = "OLD-LETTERS";
var SENDER_FORMATTED = `"${SENDER_NAME}" <${SENDER_EMAIL}>`;
var transporterInstance = null;
function isEmailConfigured() {
  const user = process.env.SMTP_USER?.trim() || SENDER_EMAIL;
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(user && pass);
}
function getTransporter() {
  const pass = process.env.SMTP_PASS?.trim();
  if (!pass) {
    return null;
  }
  if (transporterInstance) {
    return transporterInstance;
  }
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE.trim() === "true" : port === 465;
  const user = process.env.SMTP_USER?.trim() || SENDER_EMAIL;
  try {
    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      },
      // Keep serverless memory footprint low
      maxConnections: 1,
      pool: false
    });
    return transporterInstance;
  } catch (err) {
    const safeError = err && typeof err.message === "string" ? err.message : "Failed to initialize SMTP transporter";
    console.error("[OLD-LETTERS Mailroom] Transporter initialization error:", safeError);
    return null;
  }
}
function logEmailDispatch(entry) {
  const ts = entry.timestamp || (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[OLD-LETTERS EMAIL DISPATCH]
event: ${entry.type}
recipient: ${entry.to}
paymentId: ${entry.paymentId || entry.dispatchRef || "N/A"}
letterId: ${entry.letterId || "N/A"}
timestamp: ${ts}
status: ${entry.status}${entry.error ? `
provider error: ${entry.error}` : ""}`);
}
async function sendMail(options) {
  const transporter = getTransporter();
  if (!transporter) {
    const simMessageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[OLD-LETTERS Mailroom] Notice: Gmail SMTP not configured. Simulated dispatch to ${options.to}. Subject: "${options.subject}" (ID: ${simMessageId})`);
    return {
      success: true,
      messageId: simMessageId
    };
  }
  try {
    const info = await transporter.sendMail({
      from: SENDER_FORMATTED,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
      replyTo: options.replyTo || SENDER_EMAIL
    });
    console.log(`[OLD-LETTERS Mailroom] Email successfully dispatched to ${options.to}. Subject: "${options.subject}" (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const safeMessage = err && typeof err.message === "string" ? err.message : "Unknown SMTP transmission error";
    console.error(`[OLD-LETTERS Mailroom] SMTP delivery error to ${options.to}:`, safeMessage);
    return { success: false, error: safeMessage };
  }
}
var PRODUCTION_DOMAIN = "https://oldletters.vercel.app";
var EMAIL_LOGO_URL = `${PRODUCTION_DOMAIN}/logo.png`;
var EMAIL_FAVICON_URL = `${PRODUCTION_DOMAIN}/favicon.png`;
function emailWrapper(title, subtitle, contentHtml) {
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
              </div>` : ""}
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
                Held in Archival Trust \xB7 Central Postal Vault
              </div>
              <div style="margin-top: 10px;">
                <a href="${PRODUCTION_DOMAIN}" target="_blank" rel="noopener noreferrer" style="font-size: 10px; color: #78716C; text-decoration: underline; font-family: monospace;">
                  ${PRODUCTION_DOMAIN.replace(/^https?:\/\//, "")}
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
async function sendLetterDispatchedSenderEmail(params) {
  const subject = "Your letter has been dispatched \xB7 OLD-LETTERS";
  const html = emailWrapper(
    "Your letter has been dispatched",
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
          VIEW DISPATCH ARCHIVE \u2192
        </a>
      </div>
    `
  );
  return sendMail({
    to: params.senderEmail,
    subject,
    html,
    text: `Your letter to ${params.recipientName} has been dispatched (Ref: ${params.trackingCode}). Scheduled arrival: ${params.scheduledArrivalFormatted}. It will remain sealed for ${params.waitingHours} hours.`
  });
}
async function sendLetterDispatchedRecipientEmail(params) {
  const subject = "Someone has sent you a letter \xB7 OLD-LETTERS";
  const html = emailWrapper(
    "Someone has sent you a letter",
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.recipientName},</p>
      <p>
        Someone (${params.senderName ? `<strong>${params.senderName}</strong>` : "A sender"}) has sent you a private letter through <strong>OLD-LETTERS</strong>.
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
          VIEW TRANSIT COUNTDOWN \u2192
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
    text: `Someone has sent you a letter through OLD-LETTERS (Ref: ${params.trackingCode}). It is currently in transit and scheduled to arrive on ${params.scheduledArrivalFormatted}. Track status: ${params.recipientUrl}`
  });
}
async function sendHalfwaySenderEmail(params) {
  const subject = "Your letter is still in transit \xB7 OLD-LETTERS";
  const html = emailWrapper(
    "Your letter is still in transit",
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
          VIEW CORRESPONDENCE STATUS \u2192
        </a>
      </div>
    `
  );
  return sendMail({
    to: params.senderEmail,
    subject,
    html,
    text: `Your letter to ${params.recipientName} (Ref: ${params.trackingCode}) is still in transit. Approximately 24 hours remaining until arrival on ${params.scheduledArrivalFormatted}.`
  });
}
async function sendHalfwayRecipientEmail(params) {
  const subject = "Your letter is still in transit \xB7 OLD-LETTERS";
  const html = emailWrapper(
    "Your letter is still in transit",
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
          VIEW TRANSIT COUNTDOWN \u2192
        </a>
      </div>
    `
  );
  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Your letter (Ref: ${params.trackingCode}) is still in transit. Approximately 24 hours remaining until arrival on ${params.scheduledArrivalFormatted}. Track: ${params.recipientUrl}`
  });
}
async function sendPreArrivalOtpRecipientEmail(params) {
  const subject = "Your letter will arrive shortly \xB7 Verification required";
  const html = emailWrapper(
    "Your letter will arrive shortly \xB7 Verification required",
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
          GO TO LETTER ARRIVAL VAULT \u2192
        </a>
      </div>
    `
  );
  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Your letter (Ref: ${params.trackingCode}) will arrive in approximately 30 minutes at ${params.scheduledArrivalFormatted}. Your verification code is ${params.otpCode}. Open letter: ${params.recipientUrl}`
  });
}
async function sendArrivalRecipientEmail(params) {
  const subject = "Your letter has arrived \xB7 OLD-LETTERS";
  const enclosureNoticeHtml = params.hasApprovedMedia ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; margin: 18px 0; border-radius: 4px; text-align: center;">
        <span style="font-size: 13px; color: #166534; font-family: serif; font-weight: bold; display: block;">
          \u2726 Your personal message enclosure is now available.
        </span>
      </div>` : "";
  const html = emailWrapper(
    "Your Letter Has Arrived \xB7 OLD-LETTERS",
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
          DELIVERED \xB7 READY TO OPEN
        </span>
        <span style="font-size: 11px; color: #78716c; display: block; margin-top: 4px;">
          Completed at ${params.arrivalFormatted}
        </span>
      </div>
      <p style="font-size: 13px; color: #57534e;">
        Verify your recipient access and open your letter. ${params.requiresOtp ? "Please enter the verification code sent to your email to break the wax seal." : ""}
      </p>
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${params.recipientUrl}" style="background-color: #134e4a; color: #ffffff; padding: 14px 32px; font-size: 12px; text-decoration: none; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          READ YOUR DELIVERED LETTER \u2192
        </a>
      </div>
    `
  );
  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Your letter (Ref: ${params.trackingCode}) has arrived! The 48-hour wait is complete.${params.hasApprovedMedia ? "\n\nYour personal message enclosure is now available." : ""}

Read your delivered letter now: ${params.recipientUrl}`
  });
}
async function sendPaymentSubmittedSenderEmail(params) {
  const subject = "OLD-LETTERS \u2014 Payment Submitted for Verification";
  const currency = params.currency || "INR";
  const mediaLabel = params.mediaType === "VIDEO" ? "Video Message Enclosure" : "Voice Message Enclosure";
  const html = emailWrapper(
    "Payment Submitted for Verification \xB7 OLD-LETTERS",
    `PAYMENT REF: ${params.paymentId}`,
    `
      <p style="margin-top: 0;">Dear ${params.senderName || "Correspondent"},</p>
      <p>
        Your payment reference has been submitted to the Central Correspondence Bureau and is currently awaiting administrative verification.
      </p>
      <div style="background-color: #f7f6f2; border-left: 3px solid #0d9488; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 12px;">
        <div style="margin-bottom: 4px;"><strong>PAYMENT ID:</strong> ${params.paymentId}</div>
        <div style="margin-bottom: 4px;"><strong>UPI UTR REF:</strong> ${params.upiReference}</div>
        <div style="margin-bottom: 4px;"><strong>AMOUNT:</strong> \u20B9${params.amount} ${currency}</div>
        <div style="margin-bottom: 4px;"><strong>SELECTION:</strong> ${mediaLabel}</div>
        ${params.recipientName ? `<div style="margin-bottom: 4px;"><strong>RECIPIENT:</strong> ${params.recipientName}</div>` : ""}
        ${params.letterReference ? `<div style="margin-bottom: 4px;"><strong>LETTER REF:</strong> ${params.letterReference}</div>` : ""}
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
    text: `OLD-LETTERS \u2014 Payment Submitted for Verification

Payment ID: ${params.paymentId}
UTR: ${params.upiReference}
Amount: \u20B9${params.amount} ${currency}
Selection: ${mediaLabel}
Status: Pending Verification

Our bureau staff will verify your payment against our postal bank records.`
  });
}
async function sendPaymentApprovedEmail(params) {
  const subject = "OLD-LETTERS \u2014 Payment Verified";
  const currency = params.currency || "INR";
  const mediaLabel = params.mediaType === "VIDEO" ? "Video Message Enclosure" : "Voice Message Enclosure";
  const html = emailWrapper(
    "Payment Verified \xB7 OLD-LETTERS",
    `PAYMENT REF: ${params.orderReference}`,
    `
      <p style="margin-top: 0;">Greetings,</p>
      <p>
        Your payment reference for <strong>${params.featureName || mediaLabel}</strong> has been verified and approved by the central correspondence bureau administrator.
      </p>
      <div style="background-color: #f7f6f2; border-left: 3px solid #047857; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 12px;">
        <div style="margin-bottom: 4px;"><strong>PAYMENT ID:</strong> ${params.orderReference}</div>
        ${params.upiReference ? `<div style="margin-bottom: 4px;"><strong>UPI UTR:</strong> ${params.upiReference}</div>` : ""}
        <div style="margin-bottom: 4px;"><strong>AMOUNT:</strong> \u20B9${params.amount} ${currency}</div>
        <div style="margin-bottom: 4px;"><strong>ENCLOSURE:</strong> ${params.featureName || mediaLabel}</div>
        <div><strong>STATUS:</strong> <span style="color: #047857; font-weight: bold;">APPROVED</span></div>
      </div>
      ${params.adminNote ? `<p style="font-size: 13px; color: #57534e; font-style: italic;">Bureau Note: &ldquo;${params.adminNote}&rdquo;</p>` : ""}
      <p style="font-size: 13px; color: #57534e;">
        Your personal voice/video message enclosure has been verified and will accompany your letter upon delivery.
      </p>
    `
  );
  return sendMail({
    to: params.userEmail,
    subject,
    html,
    text: `OLD-LETTERS \u2014 Payment Verified

Payment ID: ${params.orderReference}
Amount: \u20B9${params.amount} ${currency}
${params.upiReference ? `UTR: ${params.upiReference}
` : ""}Status: APPROVED
Personal Message Type: ${params.featureName || mediaLabel}

Your personal voice/video enclosure will accompany your letter upon delivery.`
  });
}
async function sendPaymentIssueEmail(params) {
  const subject = "OLD-LETTERS \u2014 Payment Verification Failed";
  const currency = params.currency || "INR";
  const html = emailWrapper(
    "Payment Verification Failed \xB7 OLD-LETTERS",
    `PAYMENT REF: ${params.orderReference}`,
    `
      <p style="margin-top: 0;">Greetings,</p>
      <p>
        Your payment reference could not be verified. The UPI / UTR transaction details provided could not be confirmed with our correspondence registry.
      </p>
      <div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0; font-size: 13px; color: #991b1b; font-family: monospace;">
        <div style="margin-bottom: 4px;"><strong>PAYMENT ID:</strong> ${params.orderReference}</div>
        ${params.upiReference ? `<div style="margin-bottom: 4px;"><strong>UPI UTR:</strong> ${params.upiReference}</div>` : ""}
        <div style="margin-bottom: 4px;"><strong>AMOUNT:</strong> \u20B9${params.amount} ${currency}</div>
        <div style="margin-bottom: 4px;"><strong>STATUS:</strong> <span style="font-weight: bold;">VERIFICATION FAILED (REJECTED)</span></div>
        ${params.adminNote ? `<div style="margin-top: 6px;"><strong>ADMIN NOTE:</strong> ${params.adminNote}</div>` : ""}
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
    text: `OLD-LETTERS \u2014 Payment Verification Failed

Your payment reference could not be verified. The UPI / UTR transaction details provided could not be confirmed.

Payment ID: ${params.orderReference}
Amount: \u20B9${params.amount} ${currency}
${params.upiReference ? `UTR: ${params.upiReference}
` : ""}Status: REJECTED
${params.adminNote ? `Reason: ${params.adminNote}
` : ""}
Important: Your letter will continue and be delivered as scheduled, but the personal voice/video enclosure will NOT accompany the letter upon arrival.`
  });
}

// src/types/backend.ts
import { z } from "zod";
var CURRENT_TERMS_VERSION = "2026-10-01";
var CURRENT_PRIVACY_VERSION = "2026-10-01";
var LegalConsentSchema = z.object({
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  termsVersion: z.string().default(CURRENT_TERMS_VERSION),
  privacyVersion: z.string().default(CURRENT_PRIVACY_VERSION)
});
var CreateLetterSchema = z.object({
  type: z.string().min(1),
  templateId: z.string().trim().min(1, "Please choose your stationery before sealing the letter."),
  senderName: z.string().trim().min(1, "Sender name is required").max(100),
  senderEmail: z.string().trim().email("Valid sender email required"),
  recipientName: z.string().trim().min(1, "Recipient name is required").max(100),
  recipientEmail: z.string().trim().email("Valid recipient email required"),
  greeting: z.string().trim().min(1, "Salutation greeting is required"),
  content: z.string().trim().min(5, "Letter body content must be meaningful (at least 5 characters)"),
  signoff: z.string().trim().min(1, "Signoff is required"),
  verificationMethod: z.enum(["otp", "passphrase", "open"]).default("open"),
  passphrase: z.string().optional(),
  scheduledDeliveryAt: z.string().optional().nullable(),
  selectedTempoId: z.string().optional(),
  waitingHours: z.number().positive("Positive waiting hours required").default(48),
  postmarkCity: z.string().optional().default("Central Postal Archive"),
  status: z.enum(["DRAFT", "SCHEDULED"]).default("SCHEDULED"),
  paymentId: z.string().optional().nullable(),
  hasMediaAttachment: z.boolean().optional(),
  mediaType: z.enum(["VOICE", "VIDEO"]).optional().nullable(),
  mediaStorageKey: z.string().optional().nullable(),
  mediaStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "DELETED"]).optional(),
  personalMessage: z.any().optional()
});
var SubmitPaymentSchema = z.object({
  letterId: z.string().optional().nullable(),
  recipientEmail: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  mediaType: z.enum(["VOICE", "VIDEO", "VOICE_NOTE", "VIDEO_NOTE"]).optional(),
  featureCode: z.enum(["VOICE_NOTE", "VIDEO_NOTE", "LIVE_MEETING", "VOICE", "VIDEO"]).optional(),
  featureType: z.enum(["VOICE_MESSAGE", "VIDEO_MESSAGE", "VOICE_NOTE", "VIDEO_NOTE"]).optional(),
  amount: z.number().positive(),
  currency: z.string().optional().default("INR"),
  upiReference: z.string().trim().min(6, "Please enter a valid UPI transaction reference / UTR number (at least 6 characters).").max(35, "UPI transaction reference cannot exceed 35 characters."),
  screenshotUrl: z.string().optional().nullable()
});
var AdminVerifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().max(500).optional()
});
var RecipientVerifySchema = z.object({
  token: z.string().min(1),
  verificationMethod: z.enum(["otp", "passphrase", "open"]).optional(),
  otp: z.string().length(6).optional(),
  passphrase: z.string().optional()
});

// src/lib/mongodb.ts
import { MongoClient, ObjectId, GridFSBucket } from "mongodb";
function isProductionEnvironment() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
}
function getSanitizedMongoUri() {
  const raw = process.env.MONGODB_URI || "";
  let cleaned = raw.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"') || cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/[\r\n\t]/g, "");
}
function getSanitizedHostname(uri) {
  if (!uri) return "none";
  try {
    const afterProtocol = uri.split("://")[1];
    if (!afterProtocol) return "unknown";
    const afterAuth = afterProtocol.includes("@") ? afterProtocol.split("@")[1] : afterProtocol;
    const hostPortion = afterAuth.split("/")[0].split("?")[0];
    return hostPortion || "empty-host";
  } catch {
    return "unparseable-host";
  }
}
function logMongoDiagnostics(uri) {
  const exists = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
  const protocol = uri.startsWith("mongodb+srv://") ? "mongodb+srv://" : uri.startsWith("mongodb://") ? "mongodb://" : "invalid/missing";
  const hostname = getSanitizedHostname(uri);
  console.log("[OLD-LETTERS MongoDB Diagnostics]", {
    mongoUriConfigured: exists,
    protocol,
    sanitizedHostname: hostname,
    environment: isProductionEnvironment() ? "production" : "development",
    serverlessPlatform: Boolean(process.env.VERCEL) ? "Vercel Serverless" : "Node Runtime"
  });
}
function validateMongoUri(uri, isProd2) {
  if (!uri || uri.trim().length === 0) {
    const errorMsg = "MONGODB_URI is missing or invalid in the production environment.";
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (MONGODB_URI environment variable is empty or undefined)`);
    throw new Error(errorMsg);
  }
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    const errorMsg = "MONGODB_URI is missing or invalid in the production environment.";
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (URI must begin with mongodb:// or mongodb+srv://)`);
    throw new Error(errorMsg);
  }
  const hostname = getSanitizedHostname(uri);
  if (hostname.includes("xxxx") || hostname.includes("<") || hostname.includes(">") || hostname === "none" || hostname === "empty-host") {
    const errorMsg = "MONGODB_URI is missing or invalid in the production environment.";
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (Detected invalid placeholder hostname: ${hostname})`);
    throw new Error(errorMsg);
  }
  if (isProd2 && (hostname === "localhost" || hostname === "127.0.0.1")) {
    const errorMsg = "MONGODB_URI is missing or invalid in the production environment.";
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (Localhost URI detected in production deployment)`);
    throw new Error(errorMsg);
  }
}
try {
  logMongoDiagnostics(getSanitizedMongoUri());
} catch {
}
function isUsingAtlas() {
  return globalThis._mongoClient !== void 0;
}
async function getMongoClient() {
  const uri = getSanitizedMongoUri();
  const isProd2 = isProductionEnvironment();
  if (!globalThis._mongoDiagnosticsLogged) {
    globalThis._mongoDiagnosticsLogged = true;
    logMongoDiagnostics(uri);
  }
  validateMongoUri(uri, isProd2);
  if (globalThis._mongoClient) {
    try {
      await globalThis._mongoClient.db(process.env.MONGODB_DB_NAME || "oldletters").command({ ping: 1 });
      return globalThis._mongoClient;
    } catch {
      console.warn("[OLD-LETTERS MongoDB] Stale connection detected, reconnecting...");
      globalThis._mongoClient = void 0;
      globalThis._mongoClientPromise = void 0;
    }
  }
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 8e3,
      connectTimeoutMS: 1e4,
      socketTimeoutMS: 45e3,
      retryWrites: true,
      retryReads: true
    });
    globalThis._mongoClientPromise = client.connect().then((connectedClient) => {
      globalThis._mongoClient = connectedClient;
      return connectedClient;
    }).catch((err) => {
      globalThis._mongoClientPromise = void 0;
      globalThis._mongoClient = void 0;
      throw err;
    });
  }
  try {
    const client = await globalThis._mongoClientPromise;
    return client;
  } catch (err) {
    globalThis._mongoClientPromise = void 0;
    globalThis._mongoClient = void 0;
    const errMsg = err?.message || String(err);
    console.error("[OLD-LETTERS MongoDB] Atlas connection error:", errMsg);
    if (errMsg.includes("ENOTFOUND") || errMsg.includes("querySrv") || errMsg.includes("ETIMEDOUT") || errMsg.includes("Server selection timed out")) {
      throw new Error(
        `MongoDB Atlas connection unavailable: ${errMsg}. Please verify that MONGODB_URI contains a valid cluster hostname and MongoDB Atlas Network Access allowlist permits connections (0.0.0.0/0 for Vercel serverless).`
      );
    }
    throw err;
  }
}
async function getDb(dbName) {
  const client = await getMongoClient();
  return client.db(dbName || process.env.MONGODB_DB_NAME || "oldletters");
}
async function getGridFSBucket(bucketName = "letterMedia") {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName });
}
async function uploadGridFSBuffer(bucketName, filename, buffer, metadata = {}) {
  const bucket = await getGridFSBucket(bucketName);
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    const fileId = uploadStream.id;
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve({ fileId, filename }));
    uploadStream.end(buffer);
  });
}
async function downloadGridFSBuffer(bucketName, fileId) {
  const bucket = await getGridFSBucket(bucketName);
  try {
    const id = ObjectId.isValid(fileId.toString()) ? new ObjectId(fileId.toString()) : fileId;
    const downloadStream = bucket.openDownloadStream(id);
    const chunks = [];
    return new Promise((resolve, reject) => {
      downloadStream.on("data", (c) => chunks.push(Buffer.from(c)));
      downloadStream.on("end", () => resolve({ buffer: Buffer.concat(chunks) }));
      downloadStream.on("error", (err) => {
        if (err.message?.includes("FileNotFound") || err.code === "ENOENT") {
          resolve(null);
        } else {
          reject(err);
        }
      });
    });
  } catch {
    return null;
  }
}
async function deleteGridFSFile(bucketName, fileId) {
  const bucket = await getGridFSBucket(bucketName);
  try {
    const id = ObjectId.isValid(fileId.toString()) ? new ObjectId(fileId.toString()) : fileId;
    await bucket.delete(id);
    return true;
  } catch {
    return false;
  }
}
async function setupDatabaseIndexes() {
  try {
    const db = await getDb();
    const letters = db.collection("letters");
    await letters.createIndex({ senderId: 1 });
    await letters.createIndex({ status: 1 });
    await letters.createIndex({ deliveryDate: 1 });
    await letters.createIndex({ trackingCode: 1 }, { unique: true, sparse: true });
    const letterRecipients = db.collection("letterRecipients");
    await letterRecipients.createIndex({ letterId: 1 });
    await letterRecipients.createIndex({ email: 1 });
    const deliveryTokens = db.collection("deliveryTokens");
    await deliveryTokens.createIndex({ tokenHash: 1 }, { unique: true, sparse: true });
    await deliveryTokens.createIndex({ expiresAt: 1 });
    const otpCodes = db.collection("otpCodes");
    await otpCodes.createIndex({ email: 1 });
    await otpCodes.createIndex({ expiresAt: 1 });
    const payments = db.collection("payments");
    await payments.createIndex({ status: 1 });
    await payments.createIndex({ userId: 1 });
    await payments.createIndex({ letterId: 1 });
    await payments.createIndex({ upiReference: 1 }, { unique: true, sparse: true });
    await payments.createIndex({ utr: 1 }, { unique: true, sparse: true });
    const rateLimits = db.collection("rateLimits");
    await rateLimits.createIndex({ key: 1 }, { unique: true });
    await rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const deliveryEvents = db.collection("deliveryEvents");
    await deliveryEvents.createIndex({ letterId: 1 });
    await deliveryEvents.createIndex({ letterId: 1, eventType: 1 }, { unique: true, sparse: true });
    const users = db.collection("users");
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
    const adminUsers = db.collection("adminUsers");
    await adminUsers.createIndex({ email: 1 }, { unique: true, sparse: true });
    const letterTemplates = db.collection("letterTemplates");
    await letterTemplates.createIndex({ slug: 1 }, { unique: true, sparse: true });
    console.log("[OLD-LETTERS MongoDB] Collections & Indexes established.");
  } catch (err) {
    console.warn("[OLD-LETTERS MongoDB] Index setup notice:", err);
  }
}
var inMemoryRateLimits = /* @__PURE__ */ new Map();
async function consumeDistributedRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const resetDate = new Date(now + windowMs);
  try {
    const db = await getDb();
    const rateLimitsColl = db.collection("rateLimits");
    const res = await rateLimitsColl.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          firstSeen: new Date(now),
          expiresAt: resetDate
        }
      },
      {
        upsert: true,
        returnDocument: "after"
      }
    );
    const doc = res?.value || res;
    if (doc) {
      const count = doc.count || 1;
      const docExpiresAt = doc.expiresAt instanceof Date ? doc.expiresAt.getTime() : now + windowMs;
      if (docExpiresAt < now) {
        await rateLimitsColl.updateOne(
          { key },
          { $set: { count: 1, expiresAt: resetDate, firstSeen: new Date(now) } }
        );
        return {
          allowed: true,
          limit,
          remaining: limit - 1,
          resetSeconds: Math.ceil(windowMs / 1e3),
          retryAfterSeconds: 0
        };
      }
      const remaining2 = Math.max(0, limit - count);
      const resetSeconds2 = Math.max(1, Math.ceil((docExpiresAt - now) / 1e3));
      const allowed2 = count <= limit;
      return {
        allowed: allowed2,
        limit,
        remaining: remaining2,
        resetSeconds: resetSeconds2,
        retryAfterSeconds: allowed2 ? 0 : resetSeconds2
      };
    }
  } catch (err) {
  }
  const rec = inMemoryRateLimits.get(key);
  if (!rec || rec.expiresAt < now) {
    inMemoryRateLimits.set(key, { count: 1, expiresAt: now + windowMs, firstSeen: now });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetSeconds: Math.ceil(windowMs / 1e3),
      retryAfterSeconds: 0
    };
  }
  rec.count += 1;
  const remaining = Math.max(0, limit - rec.count);
  const resetSeconds = Math.max(1, Math.ceil((rec.expiresAt - now) / 1e3));
  const allowed = rec.count <= limit;
  return {
    allowed,
    limit,
    remaining,
    resetSeconds,
    retryAfterSeconds: allowed ? 0 : resetSeconds
  };
}

// scripts/seed.ts
import dotenv from "dotenv";

// src/data/mockData.ts
var TEMPLATES = [
  {
    id: "ivory-classic",
    name: "Ivory Classic",
    category: "CLASSIC",
    suitableCategories: ["PERSONAL", "EMOTIONAL", "CELEBRATION"],
    description: "Warm ivory laid paper with delicate double-line antique border, traditional epistolary serif typography, and rich charcoal-sepia ink.",
    tagline: "The timeless dignity of handwritten correspondence",
    // Contrast-safe theme tokens
    paperBackground: "#FAF6EE",
    paperForeground: "#3A2520",
    paperMuted: "#7A655C",
    paperAccent: "#5C1D24",
    paperBorder: "#CBBDA5",
    paperColor: "#FAF6EE",
    paperBg: "bg-[#FAF6EE]",
    inkColor: "#3A2520",
    textColor: "text-[#3A2520]",
    fontFamily: "serif",
    borderStyle: "antique-double",
    borderColor: "#CBBDA5",
    backgroundTexture: "rag-paper",
    paperWeight: "280 gsm Italian Laid Cotton Rag",
    textureDescription: "Artisanal laid ribbing, deckled natural edge, warm ivory cast with mineral pigment absorption",
    reverseSideDetails: {
      title: "Watermarked Mill Guarantee",
      description: "Handcrafted on slow-turning cylinder moulds. Contains 100% long-staple cotton fibers.",
      markings: "CORRESPONDENCE BUREAU \xB7 ARCHIVAL PAPERS \xB7 WATERMARK EST. 1926"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "CORRESPONDENCE BUREAU \xB7 ARCHIVAL LAID",
      watermark: "OLD-LETTERS EST. 2026"
    },
    envelopeStyle: {
      bgColor: "#ece5d8",
      flapColor: "#ded4c3",
      liningPattern: "parchment-cream",
      borderAccent: "#cbbda5"
    },
    waxSealStyle: {
      color: "#5c1d24",
      emblem: "\u2712",
      name: "Burgundy Quill Seal"
    },
    postalMarks: {
      postmarkText: "CENTRAL POSTAL ARCHIVE",
      cachetCity: "Central Bureau",
      docketNumber: "EP-1892",
      stampName: "Archival Quill 25",
      stampIllustration: "\u{1F981}",
      cancellationDate: "12 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nSome thoughts are too quiet for telephone calls, and too sacred for instant messages. I wanted you to hold these words in your hands, knowing they were written with stillness and patient care.",
    sampleSignoff: "With affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "midnight-archive",
    name: "Midnight Archive",
    category: "SPECIAL",
    suitableCategories: ["ROMANTIC", "SPECIAL", "EMOTIONAL"],
    description: "Deep twilight navy paper inscripted in warm starlight cream calligraphy, framed by fine metallic gold filigree and celestial constellations. (High-contrast, highly legible).",
    tagline: "Written in the velvet silence when the whole city sleeps",
    // Contrast-safe theme tokens: Light text on dark navy
    paperBackground: "#111B24",
    paperForeground: "#F7F0E5",
    paperMuted: "#C5BAA9",
    paperAccent: "#BFA270",
    paperBorder: "#2E3F50",
    paperColor: "#111B24",
    paperBg: "bg-[#111B24]",
    inkColor: "#F7F0E5",
    textColor: "text-[#F7F0E5]",
    fontFamily: "serif",
    borderStyle: "midnight-gold",
    borderColor: "#BFA270",
    backgroundTexture: "night-sky",
    paperWeight: "300 gsm Deep Twilight Starlight Laid Board",
    textureDescription: "Matte midnight navy paper with metallic gold filigree borders and starlight celestial coordinates",
    reverseSideDetails: {
      title: "Celestial Meridian Chart",
      description: "Celestial night sky chart at 02:00 AM, mapping Orion, Ursa Major, and the celestial meridian.",
      markings: "NOCTURNE OBSERVATORY \xB7 02:00 APPOINTMENT \xB7 LAT 17.3850 N"
    },
    decorations: {
      headerMark: "NOCTURNE CORRESPONDENCE \xB7 02:00 APPOINTMENT",
      watermark: "constellation-deccan",
      cornerFlourish: true
    },
    envelopeStyle: {
      bgColor: "#162232",
      flapColor: "#111b27",
      liningPattern: "gold-foil-starlight",
      borderAccent: "#c9a84e"
    },
    waxSealStyle: {
      color: "#c9a84e",
      emblem: "\u263E",
      name: "Celestial Gold Crescent Seal"
    },
    postalMarks: {
      postmarkText: "MIDNIGHT OBSERVATORY DISPATCH",
      cachetCity: "Observatory Chamber",
      docketNumber: "NC-0214",
      stampName: "Crescent Moon 50p",
      stampIllustration: "\u{1F319}",
      cancellationDate: "14 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "The distant lanterns have finally blinked out one by one into the velvet silence.\n\nMidnight has a way of stripping away every pretence. I am writing to you because in the quietest silence of the day, your voice is still the one I hear most clearly.\n\nUnder this canopy of stars, take this letter as my promise to remain beside you through every season.",
    sampleSignoff: "Under the same stars,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "02:14 AM \xB7 14 October 2026"
  },
  {
    id: "antique-vellum",
    name: "Antique Vellum",
    category: "SPECIAL",
    suitableCategories: ["ROMANTIC", "CELEBRATION", "SPECIAL"],
    description: "Aged parchment sheet with rich walnut-brown ink, deckled visual edges, and ceremonial heraldic brass detailing.",
    tagline: "Old-world archival parchment with timeless warmth",
    // Contrast-safe theme tokens
    paperBackground: "#E8D8BD",
    paperForeground: "#4A3528",
    paperMuted: "#6E5443",
    paperAccent: "#76533A",
    paperBorder: "#C4AF91",
    paperColor: "#E8D8BD",
    paperBg: "bg-[#E8D8BD]",
    inkColor: "#4A3528",
    textColor: "text-[#4A3528]",
    fontFamily: "editorial",
    borderStyle: "vellum-layered",
    borderColor: "#C4AF91",
    backgroundTexture: "aged-parchment",
    paperWeight: "260 gsm Antique Deckled Vellum Sheet",
    textureDescription: "Warm parchment with subtle fiber grain, warm deckled borders, and high ink adhesion",
    reverseSideDetails: {
      title: "Chancery Archival Bond",
      description: "Deckle-edge rag foundation sheet, fastened with hand-pleated grosgrain silk ribbon.",
      markings: "CHANCERY CEREMONIAL REGISTER \xB7 PROTOCOL SPECIFICATION 882"
    },
    decorations: {
      headerMark: "TRANSLUCENT VELLUM \xB7 CEREMONIAL EDITION",
      liningDetail: "silk-ribbon-sash"
    },
    envelopeStyle: {
      bgColor: "#e2d3b6",
      flapColor: "#d4c2a3",
      liningPattern: "frosted-vellum-jacket",
      borderAccent: "#76533a"
    },
    waxSealStyle: {
      color: "#d49b38",
      emblem: "\u269C",
      name: "Honey Amber Heraldic Seal"
    },
    postalMarks: {
      postmarkText: "CEREMONIAL CHANCERY REGISTRY",
      cachetCity: "Honorary Bureau",
      docketNumber: "VL-882",
      stampName: "Heraldic Fleur-de-lis 1R",
      stampIllustration: "\u269C",
      cancellationDate: "25 OCT 2026"
    },
    sampleSalutation: "Respected Recipient,",
    sampleBody: "A milestone such as yours comes once in a generation.\n\nWatching you build your life work with quiet dignity has been an inspiration to all of us. Please accept this formal testament of our highest esteem and pride.\n\nMay this document preserve our gratitude for your guidance through the years.",
    sampleSignoff: "With enduring respect,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "25 October 2026"
  },
  {
    id: "blush-pressed-rose",
    name: "Blush Pressed Rose",
    category: "ROMANTIC",
    suitableCategories: ["ROMANTIC"],
    description: "Soft warm blush/rose paper inscripted in deep burgundy wine ink, featuring crimson filigree corner accents and rose botanical details.",
    tagline: "Sophisticated romantic warmth, never childish",
    // Contrast-safe theme tokens
    paperBackground: "#F3DDD9",
    paperForeground: "#54242A",
    paperMuted: "#7E4B53",
    paperAccent: "#8A4650",
    paperBorder: "#D8B4B8",
    paperColor: "#F3DDD9",
    paperBg: "bg-[#F3DDD9]",
    inkColor: "#54242A",
    textColor: "text-[#54242A]",
    fontFamily: "editorial",
    borderStyle: "crimson-filigree",
    borderColor: "#D8B4B8",
    backgroundTexture: "rag-paper",
    paperWeight: "320 gsm French Velour Blush Parchment",
    textureDescription: "Velvety blush-ivory touch, bleed-resistant for deep carmine inks, subtle blind-debossed florets",
    reverseSideDetails: {
      title: "Devotion Watermark Imprint",
      description: "Blind embossed floret pattern and watermarked Latin maxim on heavy velour paper.",
      markings: "AMOR VINCIT OMNIA \xB7 OLD-LETTERS PRIVATE REGISTER"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "CONFIDENTIAL EPISTLE \xB7 AMOR SINCERUS",
      watermark: "\u2766"
    },
    envelopeStyle: {
      bgColor: "#ebd0ca",
      flapColor: "#ddbfb9",
      liningPattern: "deep-crimson-velvet",
      borderAccent: "#54242a"
    },
    waxSealStyle: {
      color: "#781d26",
      emblem: "\u2766",
      name: "Royal Carmine Seal"
    },
    postalMarks: {
      postmarkText: "PRIVATE HEARTS DESPATCH",
      cachetCity: "Central Bureau",
      docketNumber: "LL-0921",
      stampName: "Crimson Dove 20p",
      stampIllustration: "\u{1F54A}",
      cancellationDate: "04 DEC 2026"
    },
    sampleSalutation: "My Beloved Recipient,",
    sampleBody: "In a world that hurries through every feeling, I wanted to build a sanctuary for ours.\n\nEvery time my train pulls into Secunderabad station, my eyes search for you in the crowd. Time has only deepened what I first saw in your eyes.\n\nI fold this letter with the certainty that whatever comes next, we face it together.",
    sampleSignoff: "Yours, always and wholly,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "04 December 2026"
  },
  {
    id: "love-letter",
    name: "Love Letter",
    category: "ROMANTIC",
    suitableCategories: ["ROMANTIC", "EMOTIONAL"],
    description: "Warm ivory blush paper framed with delicate crimson filigree corners and deep romantic burgundy ink. Built for words of devotion.",
    tagline: "Devotion inscribed in crimson filigree",
    paperBackground: "#FCF6F0",
    paperForeground: "#4A151B",
    paperMuted: "#804E55",
    paperAccent: "#8B2635",
    paperBorder: "#E8C8CE",
    paperColor: "#FCF6F0",
    paperBg: "bg-[#FCF6F0]",
    inkColor: "#4A151B",
    textColor: "text-[#4A151B]",
    fontFamily: "editorial",
    borderStyle: "crimson-filigree",
    borderColor: "#E8C8CE",
    backgroundTexture: "rag-paper",
    paperWeight: "270 gsm Soft Cream Epistolary Rag",
    textureDescription: "Velvety smooth cotton finish with crimson deckled edges and embossed romantic heart watermark",
    reverseSideDetails: {
      title: "Devotional Paper Guarantee",
      description: "Specially milled for intimate correspondence. Impervious to time, treasured through generations.",
      markings: "CONFIDENTIAL CORRESPONDENCE \xB7 DEVOTIONAL SERIES \xB7 SEALED"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "DEVOTIONAL EPISTLE \xB7 PRIVATE",
      watermark: "AMOR VINCIT"
    },
    envelopeStyle: {
      bgColor: "#f4e6e8",
      flapColor: "#edd0d4",
      liningPattern: "damask-crimson",
      borderAccent: "#8b2635"
    },
    waxSealStyle: {
      color: "#8b2635",
      emblem: "\u2665",
      name: "Scarlet Heart Seal"
    },
    postalMarks: {
      postmarkText: "EXPRESS COURIER OF THE HEART",
      cachetCity: "Secret Despatch",
      docketNumber: "AMOR-1402",
      stampName: "Two Doves 30p",
      stampIllustration: "\u{1F54A}",
      cancellationDate: "HEARTFELT"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nThere are feelings that defy casual conversation, emotions that only reveal themselves when given the quiet grace of a handwritten page. You have my heart, now and always.",
    sampleSignoff: "With affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "apology",
    name: "Apology",
    category: "EMOTIONAL",
    suitableCategories: ["EMOTIONAL", "PERSONAL"],
    description: "Quiet, unadorned mist paper with deep graphite ink, generous restful margins, and sincere typographic restraint.",
    tagline: "Quiet sincerity and honest humility",
    paperBackground: "#F4F3EF",
    paperForeground: "#2B3338",
    paperMuted: "#5F6B70",
    paperAccent: "#4F6367",
    paperBorder: "#D3D6CE",
    paperColor: "#F4F3EF",
    paperBg: "bg-[#F4F3EF]",
    inkColor: "#2B3338",
    textColor: "text-[#2B3338]",
    fontFamily: "serif",
    borderStyle: "apology-minimal",
    borderColor: "#D3D6CE",
    backgroundTexture: "linen",
    paperWeight: "260 gsm Contemplative Stone Laid Cotton",
    textureDescription: "Subdued matte surface, fine horizontal ribbing, restful neutral tone allowing honesty to speak without distraction",
    reverseSideDetails: {
      title: "Restorative Correspondence",
      description: "Milled with quiet simplicity. Crafted for reconciliation, reflection, and amends.",
      markings: "OLD-LETTERS CORRESPONDENCE \xB7 SINCERITY SERIES"
    },
    decorations: {
      cornerFlourish: false,
      headerMark: "SINCERE CORRESPONDENCE",
      watermark: "PAX"
    },
    envelopeStyle: {
      bgColor: "#e6e5e0",
      flapColor: "#dad8d1",
      liningPattern: "plain-linen",
      borderAccent: "#4f6367"
    },
    waxSealStyle: {
      color: "#4f6367",
      emblem: "\u{1F33F}",
      name: "Olive Branch Slate Seal"
    },
    postalMarks: {
      postmarkText: "PEACEFUL HARBOR DESPATCH",
      cachetCity: "Sincere Bureau",
      docketNumber: "AMEND-049",
      stampName: "Peace Crane 15p",
      stampIllustration: "\u{1F54A}",
      cancellationDate: "12 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life, and how deeply I regret the moments when I failed to show it.\n\nPlease know that this letter comes from an honest heart, with the hope that we can mend whatever silence has grown between us.",
    sampleSignoff: "With sincerity and affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "thank-you",
    name: "Thank You",
    category: "PERSONAL",
    suitableCategories: ["PERSONAL", "CELEBRATION", "EMOTIONAL"],
    description: "Warm champagne linen paper with deep forest olive ink, delicate burnished gold foliage accents, and timeless gratitude flourishes.",
    tagline: "Warm champagne linen and golden gratitude",
    paperBackground: "#F9F7EE",
    paperForeground: "#2E3626",
    paperMuted: "#5A654F",
    paperAccent: "#B8860B",
    paperBorder: "#D9D1B8",
    paperColor: "#F9F7EE",
    paperBg: "bg-[#F9F7EE]",
    inkColor: "#2E3626",
    textColor: "text-[#2E3626]",
    fontFamily: "serif",
    borderStyle: "thankyou-foliage",
    borderColor: "#D9D1B8",
    backgroundTexture: "linen",
    paperWeight: "280 gsm Champagne Linen Finish Paper",
    textureDescription: "Crisp woven linen grid, warm golden luster, radiant paper margins embossed with delicate gratitude laurel sprigs",
    reverseSideDetails: {
      title: "Honorary Gratitude Paper",
      description: "Loom-woven flax and cotton pulp. Reflects natural warm sunlight.",
      markings: "GRATIA \xB7 CORRESPONDENCE GUILD \xB7 SUN-BLEACHED FLAX"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "EXPRESSION OF GRATITUDE \xB7 ACCORD",
      watermark: "GRATITUDO"
    },
    envelopeStyle: {
      bgColor: "#ede8d5",
      flapColor: "#ded8c0",
      liningPattern: "golden-laurel",
      borderAccent: "#b8860b"
    },
    waxSealStyle: {
      color: "#b8860b",
      emblem: "\u{1F33E}",
      name: "Golden Wheat Sheaf Seal"
    },
    postalMarks: {
      postmarkText: "HONORARY POSTAL REGISTRY",
      cachetCity: "Gratitude Chamber",
      docketNumber: "THANKS-88",
      stampName: "Golden Bough 25p",
      stampIllustration: "\u{1F33F}",
      cancellationDate: "12 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life, and how grateful I am for every kindness you have shown me.\n\nYour generosity has made a quiet, lasting difference in my days. Thank you for being such an extraordinary friend.",
    sampleSignoff: "With deepest gratitude and affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "birthday",
    name: "Birthday",
    category: "CELEBRATION",
    suitableCategories: ["CELEBRATION", "PERSONAL"],
    description: "Warm celebratory vanilla vellum with rich espresso ink, subtle geometric garland borders, and joyful vintage serif typography.",
    tagline: "Festive vanilla vellum and celebratory warmth",
    paperBackground: "#FBF6EA",
    paperForeground: "#2B231D",
    paperMuted: "#735E4E",
    paperAccent: "#C27D38",
    paperBorder: "#DECBA4",
    paperColor: "#FBF6EA",
    paperBg: "bg-[#FBF6EA]",
    inkColor: "#2B231D",
    textColor: "text-[#2B231D]",
    fontFamily: "serif",
    borderStyle: "birthday-garland",
    borderColor: "#DECBA4",
    backgroundTexture: "rag-paper",
    paperWeight: "290 gsm Festive Vanilla Rag Vellum",
    textureDescription: "Warm custard ivory paper, slight speckled vanilla fibers, amber geometric festive border with vintage serif warmth",
    reverseSideDetails: {
      title: "Celebratory Jubilee Registry",
      description: "Specially pressed for milestone anniversaries and annual celebrations.",
      markings: "JUBILEE DIVISION \xB7 MILESTONE ARCHIVES \xB7 FESTIVE SEAL"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "ANNUAL MILESTONE \xB7 CELEBRATION",
      watermark: "JUBILEE"
    },
    envelopeStyle: {
      bgColor: "#efe3cc",
      flapColor: "#e2d3b5",
      liningPattern: "confetti-geometric",
      borderAccent: "#c27d38"
    },
    waxSealStyle: {
      color: "#c27d38",
      emblem: "\u2600\uFE0F",
      name: "Sunburst Bronze Seal"
    },
    postalMarks: {
      postmarkText: "JUBILEE CELEBRATION POST",
      cachetCity: "Festive Bureau",
      docketNumber: "BDAY-365",
      stampName: "Solar Flare 40p",
      stampIllustration: "\u{1F382}",
      cancellationDate: "ANNIVERSARY POST"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nOn this wonderful day, I wanted to tell you how much I value your presence in my life, and celebrate everything that makes you who you are.\n\nMay the coming year bring you peace, deep joy, unexpected wonder, and good health. Wishing you the happiest of birthdays.",
    sampleSignoff: "With celebration and affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "congratulations",
    name: "Congratulations",
    category: "CELEBRATION",
    suitableCategories: ["CELEBRATION", "PERSONAL", "SPECIAL"],
    description: "Crisp heavyweight cotton paper with regal deep navy ink, gilded laurel wreath watermark, and formal triumphant double border.",
    tagline: "Formal triumph framed in navy and gilded laurels",
    paperBackground: "#F8F9FA",
    paperForeground: "#1C2B36",
    paperMuted: "#526372",
    paperAccent: "#C5A059",
    paperBorder: "#D1D5DB",
    paperColor: "#F8F9FA",
    paperBg: "bg-[#F8F9FA]",
    inkColor: "#1C2B36",
    textColor: "text-[#1C2B36]",
    fontFamily: "display",
    borderStyle: "congratulations-laurel",
    borderColor: "#D1D5DB",
    backgroundTexture: "cotton-wove",
    paperWeight: "310 gsm Cold-Press Archival Cotton",
    textureDescription: "Substantial archival cotton board with crisp edges, deep royal navy letterpress, and embossed golden laurel medal",
    reverseSideDetails: {
      title: "Triumphant Commendation Seal",
      description: "Certified museum-grade cold-press cotton board. Built to honor monumental milestones.",
      markings: "HONORARY GUILD \xB7 COMMENDATION REGISTER \xB7 GRADE 1"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "FORMAL COMMENDATION \xB7 TRIUMPH",
      watermark: "VICTORIA"
    },
    envelopeStyle: {
      bgColor: "#e9ecef",
      flapColor: "#dee2e6",
      liningPattern: "regal-damask",
      borderAccent: "#c5a059"
    },
    waxSealStyle: {
      color: "#c5a059",
      emblem: "\u{1F451}",
      name: "Sovereign Gold Crown Seal"
    },
    postalMarks: {
      postmarkText: "OFFICIAL COMMENDATION DESPATCH",
      cachetCity: "Chancery Bureau",
      docketNumber: "TRIUMPH-100",
      stampName: "Imperial Laurel 50p",
      stampIllustration: "\u{1F3C6}",
      cancellationDate: "12 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to celebrate this tremendous achievement with you and tell you how proud I am of all the quiet dedication that led to this moment.\n\nYou have earned this triumph through patience, resilience, and sheer resolve. Please accept my warmest and most admiring congratulations.",
    sampleSignoff: "With boundless pride and affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "encouragement",
    name: "Encouragement",
    category: "EMOTIONAL",
    suitableCategories: ["EMOTIONAL", "PERSONAL"],
    description: "Soothing morning sage paper with deep evergreen pine ink, uplifting botanical sprig motifs, and reassuring steady margins.",
    tagline: "Morning sage and steadfast reassurance",
    paperBackground: "#F3F7F4",
    paperForeground: "#1F382B",
    paperMuted: "#476654",
    paperAccent: "#4D7C5D",
    paperBorder: "#C8D7CB",
    paperColor: "#F3F7F4",
    paperBg: "bg-[#F3F7F4]",
    inkColor: "#1F382B",
    textColor: "text-[#1F382B]",
    fontFamily: "serif",
    borderStyle: "encouragement-botanical",
    borderColor: "#C8D7CB",
    backgroundTexture: "rag-paper",
    paperWeight: "270 gsm Morning Sage Laid Vellum",
    textureDescription: "Calming sage undertones, soft velvet rag feel, uplifting botanical sprigs pressed along left margin",
    reverseSideDetails: {
      title: "Steadfast Sanctuary Guarantee",
      description: "Crafted to bring solace and renewal. Natural vegetable dyes and chlorine-free fibers.",
      markings: "OLD-LETTERS CORRESPONDENCE \xB7 RESILIENCE ARCHIVE"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "STEADFAST CORRESPONDENCE \xB7 HOPE",
      watermark: "SPES"
    },
    envelopeStyle: {
      bgColor: "#e3ebe5",
      flapColor: "#d3ded5",
      liningPattern: "pine-sprigs",
      borderAccent: "#4d7c5d"
    },
    waxSealStyle: {
      color: "#4d7c5d",
      emblem: "\u{1F332}",
      name: "Cedar Green Wax Seal"
    },
    postalMarks: {
      postmarkText: "HAVEN POSTAL DIVISION",
      cachetCity: "Solace Bureau",
      docketNumber: "COURAGE-77",
      stampName: "Evergreen Pine 20p",
      stampIllustration: "\u{1F33F}",
      cancellationDate: "12 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI know that recent days have asked a great deal of your spirit. I wanted to remind you of the strength you carry, and how deeply I believe in your path forward.\n\nTake this moment one breath at a time. Whatever storms arrive, they will pass, and you will emerge stronger than before.",
    sampleSignoff: "Standing beside you with affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "goodbye",
    name: "Goodbye",
    category: "EMOTIONAL",
    suitableCategories: ["EMOTIONAL", "PERSONAL"],
    description: "Twilight fog paper with poignant charcoal sepia ink, soft deckled borders, and gentle, lingering epistolary cadence.",
    tagline: "Twilight fog and gentle departures",
    paperBackground: "#EFECE6",
    paperForeground: "#2D2926",
    paperMuted: "#685F57",
    paperAccent: "#6B5B52",
    paperBorder: "#CCC5B9",
    paperColor: "#EFECE6",
    paperBg: "bg-[#EFECE6]",
    inkColor: "#2D2926",
    textColor: "text-[#2D2926]",
    fontFamily: "editorial",
    borderStyle: "goodbye-deckled",
    borderColor: "#CCC5B9",
    backgroundTexture: "deckle-cream",
    paperWeight: "260 gsm Twilight Fog Laid Paper",
    textureDescription: "Soft atmospheric grey-beige tone, feather-deckled edges, tender wistful margins that hold space for parting words",
    reverseSideDetails: {
      title: "Enduring Memory Inscription",
      description: "Acid-free cotton rag ensuring that farewell words remain intact for decades to come.",
      markings: "FAREWELL EPITAPH \xB7 MEMORY REPOSITORY \xB7 PERPETUAL"
    },
    decorations: {
      cornerFlourish: false,
      headerMark: "PARTING EPISTLE \xB7 REMEMBRANCE",
      watermark: "VALE"
    },
    envelopeStyle: {
      bgColor: "#ded9cf",
      flapColor: "#cfc9bd",
      liningPattern: "twilight-mist",
      borderAccent: "#6b5b52"
    },
    waxSealStyle: {
      color: "#6b5b52",
      emblem: "\u2693",
      name: "Smoked Pearl Anchor Seal"
    },
    postalMarks: {
      postmarkText: "LAST HARBOR EMBARKATION",
      cachetCity: "Departures G.P.O.",
      docketNumber: "FAREWELL-19",
      stampName: "Lighthouse 25p",
      stampIllustration: "\u{1F3EE}",
      cancellationDate: "DEPARTURE POST"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nAs our paths divide and new chapters call, I wanted to write down what your presence has meant to me before distance settles in.\n\nThough miles and time will separate our daily lives, the gratitude and affection I carry for you will never fade. Safe travels, wherever tomorrow leads.",
    sampleSignoff: "With fondest farewell and affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "custom-letter",
    name: "Custom Letter",
    category: "CLASSIC",
    suitableCategories: ["PERSONAL", "SPECIAL", "ROMANTIC", "EMOTIONAL", "CELEBRATION"],
    description: "Pure artisanal cold-press paper with rich fountain pen ink, versatile minimal deckled border, and bespoke wax insignia.",
    tagline: "Your words, your tempo, your unconstrained voice",
    paperBackground: "#FAF8F3",
    paperForeground: "#222222",
    paperMuted: "#555555",
    paperAccent: "#6366F1",
    paperBorder: "#D9D4CB",
    paperColor: "#FAF8F3",
    paperBg: "bg-[#FAF8F3]",
    inkColor: "#222222",
    textColor: "text-[#222222]",
    fontFamily: "serif",
    borderStyle: "custom-bespoke",
    borderColor: "#D9D4CB",
    backgroundTexture: "rag-paper",
    paperWeight: "280 gsm Pure Bespoke Cold-Press Rag",
    textureDescription: "Clean artisanal cold-press surface, minimal deckled edge, adaptable for any personal message or epistolary style",
    reverseSideDetails: {
      title: "Bespoke Atelier Mill Guarantee",
      description: "Milled without artificial brighteners. Pure long-fiber cotton for lifelong conservation.",
      markings: "ATELIER BESPOKE \xB7 HAND-FINISHED \xB7 MASTER APPRENTICE SEAL"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "BESPOKE CORRESPONDENCE \xB7 UNBOUND",
      watermark: "BESPOKE 2026"
    },
    envelopeStyle: {
      bgColor: "#ede9e1",
      flapColor: "#dfd9cf",
      liningPattern: "minimal-grid",
      borderAccent: "#6366f1"
    },
    waxSealStyle: {
      color: "#4f46e5",
      emblem: "\u{1F58B}",
      name: "Indigo Atelier Seal"
    },
    postalMarks: {
      postmarkText: "CENTRAL ATELIER DESPATCH",
      cachetCity: "Bespoke Bureau",
      docketNumber: "ATELIER-01",
      stampName: "Fountain Nib 25p",
      stampIllustration: "\u2712",
      cancellationDate: "12 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nSome thoughts are too quiet for telephone calls, and too sacred for instant messages. I wanted you to hold these words in your hands, knowing they were written with stillness and patient care.",
    sampleSignoff: "With affection,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "12 October 2026"
  },
  {
    id: "air-mail",
    name: "Air Mail",
    category: "VINTAGE",
    suitableCategories: ["PERSONAL", "ROMANTIC", "CELEBRATION"],
    description: 'Crisp international courier paper framed with alternating red and blue chevron borders, authentic "PAR AVION" postal cachets, and postmark cancellation stamps.',
    tagline: "Cross-continental transit across oceans and borders",
    // Contrast-safe theme tokens
    paperBackground: "#FBFBFA",
    paperForeground: "#18283E",
    paperMuted: "#4D627E",
    paperAccent: "#2563EB",
    paperBorder: "#2563EB",
    paperColor: "#FBFBFA",
    paperBg: "bg-[#FBFBFA]",
    inkColor: "#18283E",
    textColor: "text-[#18283E]",
    fontFamily: "typewriter",
    borderStyle: "airmail-chevron",
    borderColor: "#2563EB",
    backgroundTexture: "linen",
    paperWeight: "65 gsm Lightweight Par Avion Aerogramme",
    textureDescription: "Featherweight crisp airmail sheet with red/blue alternating chevrons and multilingual postal routing",
    reverseSideDetails: {
      title: "Aerogramme Folding Blueprint",
      description: "Bilingual overseas postal regulations, gummed flap instructions, and airway bill register.",
      markings: "A\xC9ROGRAMME \xB7 SECOND FOLD FIRST \xB7 SENDER DEPOSIT ONLY"
    },
    decorations: {
      cornerFlourish: false,
      headerMark: "PAR AVION \xB7 VIA AIR MAIL \xB7 BY AEROPOSTALE",
      stampType: "airmail-vintage"
    },
    envelopeStyle: {
      bgColor: "#f4efe8",
      flapColor: "#e6ded0",
      liningPattern: "chevron-red-blue",
      borderAccent: "#dc2626"
    },
    waxSealStyle: {
      color: "#1d3557",
      emblem: "\u2708",
      name: "Cobalt Aero Seal"
    },
    postalMarks: {
      postmarkText: "TRANSCONTINENTAL AIR MAIL",
      cachetCity: "Overseas Terminal",
      airMailBadge: true,
      docketNumber: "AM-48H-IN",
      stampName: "Air Mail Constellation 50p",
      stampIllustration: "\u2708",
      cancellationDate: "15 NOV 2026"
    },
    sampleSalutation: "Dearest Recipient,",
    sampleBody: "The autumn rains are steady this week, tapping softly against the window glass.\n\nEven across the distance between our desks, this envelope carries my unwavering affection to your doorstep.\n\nWrite back as soon as this reaches your desk.",
    sampleSignoff: "Sent across the skies,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "15 November 2026"
  },
  {
    id: "typewriter",
    name: "Typewriter",
    category: "VINTAGE",
    suitableCategories: ["PERSONAL", "EMOTIONAL"],
    description: "Authentic mechanical typewriter impression on warm manila stock, featuring mechanical stroke imperfections, ink ribbon variations, and a red proofreader\u2019s margin rule.",
    tagline: "Heavy mechanical keystrokes hammered into parchment",
    // Contrast-safe theme tokens
    paperBackground: "#F4EFE6",
    paperForeground: "#1F1F1F",
    paperMuted: "#5C5750",
    paperAccent: "#B91C1C",
    paperBorder: "#D2C7B5",
    paperColor: "#F4EFE6",
    paperBg: "bg-[#F4EFE6]",
    inkColor: "#1F1F1F",
    textColor: "text-[#1F1F1F]",
    fontFamily: "typewriter",
    borderStyle: "typewriter-rule",
    borderColor: "#D2C7B5",
    backgroundTexture: "aged-parchment",
    paperWeight: "90 gsm Mechanical Manila Stock",
    textureDescription: "Authentic typewriter ribbon carbon imprint, strike irregularities, vermilion proofreader margin guide",
    reverseSideDetails: {
      title: "Mechanical Desk Quality Stamp",
      description: "Tested on Remington Standard Model 10. Ribbon carbon density 84% opacity.",
      markings: "MECHANICAL PRESS DIVISION \xB7 INSPECTED & VERIFIED"
    },
    decorations: {
      headerMark: "DESK SPECIFICATION: REMINGTON MECHANICAL \xB7 10 CPI",
      liningDetail: "red-margin-guide"
    },
    envelopeStyle: {
      bgColor: "#e6decb",
      flapColor: "#d6cbb5",
      liningPattern: "manila-kraft",
      borderAccent: "#8a7d65"
    },
    waxSealStyle: {
      color: "#1c2420",
      emblem: "\u2328",
      name: "Cast Iron Monospace Seal"
    },
    postalMarks: {
      postmarkText: "TELEGRAPHIC DISPATCH DIVISION",
      cachetCity: "Press Room",
      docketNumber: "TW-48-26",
      stampName: "Telegraphic Dispatch 10p",
      stampIllustration: "\u26A1",
      cancellationDate: "18 OCT 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "The clatter of this typewriter keys has kept me company through midnight.\n\nThere is an honesty to letters written on steel hammers\u2014you cannot backspace, you cannot hide your thoughts. I am writing to remind you that your grit through these exams is something we all look up to.\n\nKeep your head high; the summit is near.",
    sampleSignoff: "Typed in fellowship,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "18 October 2026"
  },
  {
    id: "personal-diary",
    name: "Personal Diary",
    category: "PERSONAL",
    suitableCategories: ["PERSONAL", "EMOTIONAL"],
    description: "Faint blue feint-ruled journal sheet with vermilion left margin line, dedicated weather/location stamp, and intimate fountain pen ink.",
    tagline: "Private pages unburdened by audience or haste",
    // Contrast-safe theme tokens
    paperBackground: "#FDFBF7",
    paperForeground: "#1C2D42",
    paperMuted: "#546982",
    paperAccent: "#D9534F",
    paperBorder: "#E5DAC8",
    paperColor: "#FDFBF7",
    paperBg: "bg-[#FDFBF7]",
    inkColor: "#1C2D42",
    textColor: "text-[#1C2D42]",
    fontFamily: "handwriting",
    borderStyle: "notebook-margin",
    borderColor: "#E5DAC8",
    backgroundTexture: "ruled-blue",
    paperWeight: "120 gsm Feint-Ruled Moleskin Vellum",
    textureDescription: "Subtle 28px blue ruling, vertical scarlet margin line, receptive to fountain pen shading and ink sheens",
    reverseSideDetails: {
      title: "Daybook Folio Index",
      description: "Numbered page extracted from a leatherbound pocket ledger. Ink-bleed resistant sizing.",
      markings: "CONFIDENTIAL DAYBOOK \xB7 FOLIO 84 \xB7 PRIVATE ENTRY"
    },
    decorations: {
      headerMark: "JOURNAL DISPATCH \xB7 FOLIO 84",
      liningDetail: "feint-blue-ruled"
    },
    envelopeStyle: {
      bgColor: "#eee5d8",
      flapColor: "#e0d5c4",
      liningPattern: "fountain-ink-wash",
      borderAccent: "#a08e78"
    },
    waxSealStyle: {
      color: "#a88241",
      emblem: "\u{1F4D6}",
      name: "Antique Brass Chronicle Seal"
    },
    postalMarks: {
      postmarkText: "PERSONAL DIARY ARCHIVE",
      cachetCity: "Journal Division",
      docketNumber: "PD-1926",
      stampName: "Fountain Nib 5p",
      stampIllustration: "\u2712",
      cancellationDate: "22 SEP 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "Sitting by the veranda at dawn. The morning filter coffee is steaming, and the parrots are in the guava tree outside.\n\nI wrote this entry with you in mind, thinking of the promises we made to never let distance turn our memories into strangers.\n\nMay this quiet page carry the morning calm directly into your hands.",
    sampleSignoff: "From my journal to yours,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "22 September 2026"
  },
  {
    id: "vintage-postcard",
    name: "Vintage Postcard",
    category: "VINTAGE",
    suitableCategories: ["PERSONAL", "CELEBRATION", "SPECIAL"],
    description: "Heavy duplex cardstock with an authentic divided back: personal correspondence on the left, address lines, round postal cancellation, and vintage postal stamp on the right.",
    tagline: "Greetings sent across railway junctions and hill stations",
    // Contrast-safe theme tokens
    paperBackground: "#F6F1E7",
    paperForeground: "#26201B",
    paperMuted: "#665A50",
    paperAccent: "#C87D2A",
    paperBorder: "#C2B59E",
    paperColor: "#F6F1E7",
    paperBg: "bg-[#F6F1E7]",
    inkColor: "#26201B",
    textColor: "text-[#26201B]",
    fontFamily: "serif",
    borderStyle: "postcard-split",
    borderColor: "#C2B59E",
    backgroundTexture: "aged-parchment",
    paperWeight: "350 gsm Heavy Duplex Board",
    textureDescription: "Authentic postcard board with sepia pictorial front and divided correspondence back",
    reverseSideDetails: {
      title: "Archival Heritage Photographic Plate",
      description: "Monochrome architectural plate from the historical postal preservation series.",
      markings: "POST CARD \xB7 CARTE POSTALE \xB7 SERIES 1892"
    },
    decorations: {
      headerMark: "POST CARD \xB7 CARTE POSTALE \xB7 POSTAL SERVICE",
      stampType: "vintage-queen"
    },
    envelopeStyle: {
      bgColor: "#e8dfcb",
      flapColor: "#dacfb8",
      liningPattern: "postcard-sleeve",
      borderAccent: "#9c8c72"
    },
    waxSealStyle: {
      color: "#c87d2a",
      emblem: "\u2600",
      name: "Imperial Amber Seal"
    },
    postalMarks: {
      postmarkText: "MOUNTAIN PASS POSTAL TRANSIT",
      cachetCity: "Highland Station",
      docketNumber: "PC-784",
      stampName: "Royal Elephant 25p",
      stampIllustration: "\u{1F418}",
      cancellationDate: "09 NOV 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "Greetings from the quiet mountain station! The morning mist rolls right over the pine ridge.\n\nThought of you as soon as the narrow-gauge train pulled into the platform. Keep this card propped on your bookshelf until we catch up next month.",
    sampleSignoff: "Warmest regards,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "09 November 2026"
  },
  {
    id: "archival-photo",
    name: "Archival Photograph",
    category: "ARCHIVAL",
    suitableCategories: ["PERSONAL", "ROMANTIC", "SPECIAL"],
    description: "Sepia photographic keepsake mounted on heavyweight cream rag board with corner mounts, archival catalog notations, and hand-inscribed captions.",
    tagline: "A portrait captured in silver halide and held forever",
    // Contrast-safe theme tokens
    paperBackground: "#F5F0E6",
    paperForeground: "#241C16",
    paperMuted: "#63554A",
    paperAccent: "#7A583A",
    paperBorder: "#BAA993",
    paperColor: "#F5F0E6",
    paperBg: "bg-[#F5F0E6]",
    inkColor: "#241C16",
    textColor: "text-[#241C16]",
    fontFamily: "editorial",
    borderStyle: "photo-corners",
    borderColor: "#BAA993",
    backgroundTexture: "rag-paper",
    paperWeight: "300 gsm Acid-Free Museum Conservation Mount Board",
    textureDescription: "Heavy cream rag board fitted with photographic corner mounts, archival stamp, and sepia tone",
    reverseSideDetails: {
      title: "Museum Accession Register",
      description: "Silver halide negative classification, exposure record, and archival preservation stamp.",
      markings: "MUSEUM CONSERVANCY \xB7 ARCHIVAL SPECIMEN NO. PH-1948"
    },
    decorations: {
      headerMark: "ARCHIVAL CONSERVANCY \xB7 PHOTOGRAPHIC SPECIMEN",
      cornerFlourish: true
    },
    envelopeStyle: {
      bgColor: "#ded6c5",
      flapColor: "#cec4b0",
      liningPattern: "dark-felt-portfolio",
      borderAccent: "#7a6c58"
    },
    waxSealStyle: {
      color: "#4a382c",
      emblem: "\u2726",
      name: "Sepia Halide Seal"
    },
    postalMarks: {
      postmarkText: "PHOTOGRAPHIC ARCHIVAL REPOSITORY",
      cachetCity: "Curator Bureau",
      docketNumber: "PH-1948",
      stampName: "Silver Halide Camera 30p",
      stampIllustration: "\u{1F4F7}",
      cancellationDate: "30 OCT 2026"
    },
    sampleSalutation: "Dearest Recipient,",
    sampleBody: "I found this old print tucked inside an encyclopaedia at the British Council Library.\n\nIt made me smile all morning\u2014it captures the exact unforced laughter of that quiet afternoon beside the sea. Some moments refuse to fade.\n\nMounted here so it remains safe for decades to come.",
    sampleSignoff: "Preserved with tenderness,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "30 October 2026"
  },
  {
    id: "botanical-archive",
    name: "Botanical Archive",
    category: "ARCHIVAL",
    suitableCategories: ["PERSONAL", "EMOTIONAL", "SPECIAL"],
    description: "Museum herbarium specimen sheet featuring botanical classification margins, Latin floral references, and deep forest-herb ink on natural unbleached cotton paper.",
    tagline: "Curated in the manner of royal botanical herbariums",
    // Contrast-safe theme tokens
    paperBackground: "#F4F6F0",
    paperForeground: "#1A3626",
    paperMuted: "#466553",
    paperAccent: "#2E5D42",
    paperBorder: "#98AB95",
    paperColor: "#F4F6F0",
    paperBg: "bg-[#F4F6F0]",
    inkColor: "#1A3626",
    textColor: "text-[#1A3626]",
    fontFamily: "serif",
    borderStyle: "herbarium-grid",
    borderColor: "#98AB95",
    backgroundTexture: "linen",
    paperWeight: "260 gsm Unbleached Botanical Herbarium Paper",
    textureDescription: "Pressed botanical specimen sheet with taxonomic classification borders and forest green ink",
    reverseSideDetails: {
      title: "Taxonomic Specimen Index",
      description: "Royal Botanical Herbarium field classification. Preserved under archival linen binding.",
      markings: "HERBARIUM DECCANENSIS \xB7 ACCESSION RECORD 1912"
    },
    decorations: {
      headerMark: "HERBARIUM DECCANENSIS \xB7 SPECIMEN NO. 42",
      liningDetail: "botanical-classification-rule"
    },
    envelopeStyle: {
      bgColor: "#e8efe6",
      flapColor: "#d6dfd3",
      liningPattern: "fern-moss-lining",
      borderAccent: "#40634a"
    },
    waxSealStyle: {
      color: "#224d35",
      emblem: "\u{1F33F}",
      name: "Forest Emerald Fern Seal"
    },
    postalMarks: {
      postmarkText: "HERBARIUM CONSERVANCY ARCHIVE",
      cachetCity: "Botanical Section",
      docketNumber: "HB-1912",
      stampName: "Botanical Fern 20p",
      stampIllustration: "\u{1F33F}",
      cancellationDate: "05 NOV 2026"
    },
    sampleSalutation: "Dear Recipient,",
    sampleBody: "Specimen: Nelumbo nucifera \xB7 Dal Lake Collection.\n\nLike the lotus that roots in still waters and blooms immaculate toward the sun, your patience over these five arduous years has culminated in something rare and honorable.\n\nCatalogued here in lasting fellowship.",
    sampleSignoff: "Catalogued in friendship,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "05 November 2026"
  },
  {
    id: "time-capsule",
    name: "Time Capsule",
    category: "SPECIAL",
    suitableCategories: ["SPECIAL", "CELEBRATION"],
    description: 'Aged archival parchment bearing an official red stamped docket: "NOT TO BE OPENED UNTIL...", archival preservation seals, and numbered document credentials.',
    tagline: "A confidential message sent into the distant future",
    // Contrast-safe theme tokens
    paperBackground: "#F2EBDD",
    paperForeground: "#251C14",
    paperMuted: "#5E4C3D",
    paperAccent: "#8B2626",
    paperBorder: "#BDA78A",
    paperColor: "#F2EBDD",
    paperBg: "bg-[#F2EBDD]",
    inkColor: "#251C14",
    textColor: "text-[#251C14]",
    fontFamily: "typewriter",
    borderStyle: "capsule-docket",
    borderColor: "#BDA78A",
    backgroundTexture: "aged-parchment",
    paperWeight: "280 gsm Heavy Aged Archival Docket",
    textureDescription: 'Aged vellum with official red "NOT TO BE OPENED UNTIL..." seal, Chrono-Vault registration, and security docket',
    reverseSideDetails: {
      title: "Chrono-Postal Custody Bond",
      description: "Ten-year temporal vault warranty. Tamper-evident leaded wax seals and biometric deposit certificate.",
      markings: "CHRONO-VAULT CONFIDENTIALITY BOND \xB7 CERTIFICATE NO. 48-10Y"
    },
    decorations: {
      headerMark: "CHRONO-RECORD \xB7 OFFICIAL POSTAL PRESERVATION VAULT",
      watermark: "VAULT SEALED"
    },
    envelopeStyle: {
      bgColor: "#e2d5c2",
      flapColor: "#d0c2ad",
      liningPattern: "time-lock-security",
      borderAccent: "#8b2626"
    },
    waxSealStyle: {
      color: "#8b2626",
      emblem: "\u23F3",
      name: "Chrono Hourglass Seal"
    },
    postalMarks: {
      postmarkText: "CENTRAL CHRONO VAULT \xB7 10-YEAR LOCK",
      cachetCity: "Chrono Vault",
      docketNumber: "CAP-2036-X",
      stampName: "Chrono Hourglass 5R",
      stampIllustration: "\u23F3",
      cancellationDate: "12 OCT 2036"
    },
    sampleSalutation: "To the Recipient of 2036,",
    sampleBody: "If this envelope reaches your hands as scheduled ten years from today, you are now thirty-four.\n\nI hope you still laugh with your whole body, I hope you still love filter coffee in brass tumblers, and I hope you never forgot how fearless you were today.\n\nLook back gently on this younger version of you who loved you before you even existed.",
    sampleSignoff: "Penned from the past with endless love,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "Scheduled Unsealing: 12 October 2036"
  },
  {
    id: "pressed-flowers",
    name: "Pressed Flowers",
    category: "ROMANTIC",
    suitableCategories: ["ROMANTIC", "PERSONAL", "CELEBRATION"],
    description: "Soft cream petal parchment accented with delicate hand-illustrated pressed jasmine and fern sprigs tucked into the corners, paired with gentle rose-tinted ink.",
    tagline: "Fragile botanical memories held between pages",
    // Contrast-safe theme tokens
    paperBackground: "#FCFAF5",
    paperForeground: "#2C352A",
    paperMuted: "#5A6857",
    paperAccent: "#8A9A86",
    paperBorder: "#B4C2AB",
    paperColor: "#FCFAF5",
    paperBg: "bg-[#FCFAF5]",
    inkColor: "#2C352A",
    textColor: "text-[#2C352A]",
    fontFamily: "handwriting",
    borderStyle: "botanical-corners",
    borderColor: "#B4C2AB",
    backgroundTexture: "linen",
    paperWeight: "240 gsm Botanical Petal Laid Sheet",
    textureDescription: "Soft handmade paper with real pressed flower fiber flecks, chamomile petals, and soft deckle",
    reverseSideDetails: {
      title: "Botanical Herbarium Provenance",
      description: "Pressed flora harvested at morning dew from mountain meadows, dried between archival blotting boards.",
      markings: "FLORA DECCANENSIS \xB7 JASMINE & MAIDENHAIR SPECIMEN"
    },
    decorations: {
      cornerFlourish: true,
      botanicalAccent: "jasmine-fern",
      headerMark: "BOTANICAL KEEPSAKE \xB7 FLORA OF THE DECCAN"
    },
    envelopeStyle: {
      bgColor: "#f3ece1",
      flapColor: "#e5dcce",
      liningPattern: "botanical-sage",
      borderAccent: "#8a9a86"
    },
    waxSealStyle: {
      color: "#9a5b68",
      emblem: "\u{1FABB}",
      name: "Rose Gold Floral Seal"
    },
    postalMarks: {
      postmarkText: "MEADOW BOTANICAL PRESERVE",
      cachetCity: "Journal Division",
      docketNumber: "FL-2026",
      stampName: "Pressed Jasmine 15",
      stampIllustration: "\u{1F338}",
      cancellationDate: "28 OCT 2026"
    },
    sampleSalutation: "Dearest Recipient,",
    sampleBody: "I pressed a fresh jasmine blossom into the folds of this letter, gathered this morning from the courtyard garden.\n\nMay its memory greet you when you unfold the paper. Every petal reminds me of the gentle patience with which you listen.\n\nKeep this blossom between the pages of your favorite book.",
    sampleSignoff: "With quiet devotion,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "28 October 2026"
  },
  {
    id: "secret-letter",
    name: "Secret Letter",
    category: "SPECIAL",
    suitableCategories: ["SPECIAL", "ROMANTIC"],
    description: "Deep obsidian and copper stock designed for confidential dispatches protected under cryptographic passphrase. High-contrast cream lettering.",
    tagline: "Protected under confidential passphrase and temporal seal",
    // Contrast-safe theme tokens: Light text on dark obsidian
    paperBackground: "#14191D",
    paperForeground: "#F2ECE4",
    paperMuted: "#A69F95",
    paperAccent: "#C9883E",
    paperBorder: "#323D47",
    paperColor: "#14191D",
    paperBg: "bg-[#14191D]",
    inkColor: "#F2ECE4",
    textColor: "text-[#F2ECE4]",
    fontFamily: "typewriter",
    borderStyle: "midnight-gold",
    borderColor: "#C9883E",
    backgroundTexture: "night-sky",
    paperWeight: "320 gsm Obsidian Security Bond",
    textureDescription: "Opaque matte dark carbon board with copper foil debossing and anti-tamper watermark",
    reverseSideDetails: {
      title: "Cryptographic Security Bond",
      description: "Temporal passphrase lock certificate. Dispatched under single-recipient protocol.",
      markings: "STRICTLY CONFIDENTIAL \xB7 FOR EYES OF DESIGNATED RECIPIENT ONLY"
    },
    decorations: {
      headerMark: "CONFIDENTIAL CIPHER \xB7 PASSPHRASE SEALED",
      watermark: "CLASSIFIED",
      cornerFlourish: true
    },
    envelopeStyle: {
      bgColor: "#1a2228",
      flapColor: "#141a1f",
      liningPattern: "security-crosshatch",
      borderAccent: "#c9883e"
    },
    waxSealStyle: {
      color: "#c9883e",
      emblem: "\u{1F512}",
      name: "Copper Cipher Seal"
    },
    postalMarks: {
      postmarkText: "CONFIDENTIAL VAULT REGISTRY",
      cachetCity: "Secret Registry",
      docketNumber: "SEC-9904",
      stampName: "Cipher Key 50p",
      stampIllustration: "\u{1F5DD}",
      cancellationDate: "01 NOV 2026"
    },
    sampleSalutation: "Dearest Recipient,",
    sampleBody: "Between you and me, locked beneath our private cipher.\n\nSome revelations belong strictly between two pairs of eyes and nowhere else in this noisy city.\n\nWhat is written here remains our sanctuary.",
    sampleSignoff: "In utmost secrecy,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "01 November 2026"
  },
  {
    id: "future-letter",
    name: "Future Letter",
    category: "SPECIAL",
    suitableCategories: ["SPECIAL", "CELEBRATION"],
    description: "Astral cream parchment accented with golden compass rules, celestial coordinates, and rich sepia ink.",
    tagline: "Dispatched to a tomorrow not yet arrived",
    // Contrast-safe theme tokens
    paperBackground: "#FAF5E8",
    paperForeground: "#2D2319",
    paperMuted: "#6E5E4F",
    paperAccent: "#B8860B",
    paperBorder: "#D8C49D",
    paperColor: "#FAF5E8",
    paperBg: "bg-[#FAF5E8]",
    inkColor: "#2D2319",
    textColor: "text-[#2D2319]",
    fontFamily: "serif",
    borderStyle: "antique-double",
    borderColor: "#D8C49D",
    backgroundTexture: "rag-paper",
    paperWeight: "280 gsm Celestial Laid Parchment",
    textureDescription: "Warm golden-tinted rag paper with fine laid compass markings and metallic bronze ink accents",
    reverseSideDetails: {
      title: "Temporal Navigation Route",
      description: "Scheduled transit coordinates across calendar years. Certified by Central Registry.",
      markings: "TEMPORAL EXPEDITION \xB7 LAT 17.3850 N \xB7 DESTINATION 2030"
    },
    decorations: {
      cornerFlourish: true,
      headerMark: "TEMPORAL DISPATCH \xB7 FUTURE APPOINTMENT",
      watermark: "TEMPORAL"
    },
    envelopeStyle: {
      bgColor: "#eee5d0",
      flapColor: "#dfd4bd",
      liningPattern: "celestial-compass",
      borderAccent: "#b8860b"
    },
    waxSealStyle: {
      color: "#b8860b",
      emblem: "\u2727",
      name: "Imperial Solar Seal"
    },
    postalMarks: {
      postmarkText: "TEMPORAL TRANSIT DIVISION",
      cachetCity: "Future Despatch",
      docketNumber: "FUT-2030",
      stampName: "Solar Compass 1R",
      stampIllustration: "\u{1F9ED}",
      cancellationDate: "01 JAN 2030"
    },
    sampleSalutation: "To My Future Companion,",
    sampleBody: "By the time you break this seal, years will have reshaped our lives in ways we cannot now foresee.\n\nNever forget the courage with which you started, the dreams that kept you awake at night, and the people who stood beside you when the path was unclear.\n\nGreeting you from a yesterday that believed in you completely.",
    sampleSignoff: "With unwavering faith,",
    sampleRecipient: "Recipient Name",
    sampleSender: "Your Name",
    sampleCity: "Postal Archive",
    sampleDate: "Scheduled Arrival: 01 January 2030"
  }
];

// src/lib/admin.ts
var ADMIN_EMAILS = Object.freeze([
  "poosala15@gmail.com",
  "oldletters.mailroom@gmail.com"
]);
function isAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(normalized)) {
    return true;
  }
  if (typeof process !== "undefined" && process.env?.ADMIN_EMAIL) {
    if (normalized === process.env.ADMIN_EMAIL.trim().toLowerCase()) {
      return true;
    }
  }
  return false;
}
function isUserAdminRole(role) {
  if (!role || typeof role !== "string") return false;
  return role.trim().toUpperCase() === "ADMIN";
}

// scripts/seed.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";
dotenv.config();
function hashSha256(val) {
  return crypto.createHash("sha256").update(val).digest("hex");
}
async function seedDatabase() {
  console.log("[OLD-LETTERS Seed] Initializing MongoDB database collections...");
  const db = await getDb();
  await setupDatabaseIndexes();
  const templatesColl = db.collection("letterTemplates");
  for (const t of TEMPLATES) {
    const existing = await templatesColl.findOne({ slug: t.id });
    if (!existing) {
      await templatesColl.insertOne({
        name: t.name,
        slug: t.id,
        category: t.category,
        description: t.description,
        previewImageUrl: void 0,
        configuration: {
          paperBg: t.paperBg,
          paperColor: t.paperColor,
          textColor: t.textColor,
          fontFamily: t.fontFamily,
          accentBorder: t.borderColor || t.borderStyle,
          sealColor: t.waxSealStyle?.color || "#5c1d24",
          sealEmblem: t.waxSealStyle?.emblem || "\u2712",
          envelopeBg: t.envelopeStyle?.bgColor || "#ece5d8",
          envelopeFlapBg: t.envelopeStyle?.flapColor || "#ded4c3",
          tagline: t.tagline
        },
        isActive: true,
        sortOrder: 1,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  console.log(`[OLD-LETTERS Seed] Seeded ${TEMPLATES.length} stationery templates.`);
  const adminUsersColl = db.collection("adminUsers");
  const admins = [
    { email: "poosala15@gmail.com", role: "ADMIN" },
    { email: "oldletters.mailroom@gmail.com", role: "ADMIN" },
    ...process.env.ADMIN_EMAIL ? [{ email: process.env.ADMIN_EMAIL, role: "ADMIN" }] : []
  ];
  for (const admin of admins) {
    const existing = await adminUsersColl.findOne({ email: admin.email });
    if (!existing) {
      await adminUsersColl.insertOne({
        email: admin.email,
        role: admin.role,
        createdAt: /* @__PURE__ */ new Date()
      });
    }
  }
  const usersColl = db.collection("users");
  const sampleUsers = [
    { fullName: "Sender Name", email: "sender@oldletters.in", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120" },
    { fullName: "Recipient Name", email: "recipient@example.com", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120" }
  ];
  const defaultPasswordHash = await bcrypt.hash("letters1892", 10);
  const userMap = /* @__PURE__ */ new Map();
  for (const u of sampleUsers) {
    let existing = await usersColl.findOne({ email: u.email });
    if (!existing) {
      const res = await usersColl.insertOne({
        fullName: u.fullName,
        email: u.email,
        passwordHash: defaultPasswordHash,
        avatarUrl: u.avatarUrl,
        authProvider: "EMAIL",
        role: isAdminEmail(u.email) ? "ADMIN" : "USER",
        emailVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: "2026-10-01",
        privacyVersion: "2026-10-01",
        legalConsentAt: /* @__PURE__ */ new Date(),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      existing = { _id: res.insertedId, ...u };
    }
    userMap.set(u.email, existing);
  }
  const lettersColl = db.collection("letters");
  const recipientsColl = db.collection("letterRecipients");
  const deliveryTokensColl = db.collection("deliveryTokens");
  const deliveryEventsColl = db.collection("deliveryEvents");
  const senderUser = userMap.get("sender@oldletters.in");
  const senderId = senderUser ? senderUser._id : new ObjectId();
  const count = await lettersColl.countDocuments();
  if (count === 0) {
    const rawToken = "48hourstowaitforloveceremony001";
    const tokenHash = hashSha256(rawToken);
    const letterId = new ObjectId();
    const now = /* @__PURE__ */ new Date();
    const past49Hours = new Date(now.getTime() - 49 * 3600 * 1e3);
    const past1Hour = new Date(now.getTime() - 1 * 3600 * 1e3);
    await lettersColl.insertOne({
      _id: letterId,
      senderId,
      letterType: "LOVE",
      templateId: "ivory",
      salutation: "Dearest Recipient,",
      body: "I am writing this on the quiet veranda as dusk descends. I chose the 48-hour post because some words deserve the quiet patience of waiting.",
      signoff: "Yours in patience,",
      status: "DELIVERED",
      deliveryDate: past1Hour,
      trackingCode: "OL-1892-A",
      recipientVerificationMethod: "open",
      postmarkCity: "Central Postal Archive",
      waitingHours: 48,
      attachments: [],
      postedAt: past49Hours,
      deliveredAt: past1Hour,
      createdAt: past49Hours,
      updatedAt: past1Hour
    });
    await recipientsColl.insertOne({
      letterId,
      email: "recipient@example.com",
      displayName: "Recipient Name",
      verificationMethod: "open",
      verifiedAt: past1Hour,
      createdAt: past49Hours
    });
    await deliveryTokensColl.insertOne({
      letterId,
      tokenHash,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1e3),
      createdAt: past49Hours
    });
    await deliveryEventsColl.insertOne({
      letterId,
      eventType: "LETTER_POSTED",
      metadata: { city: "Central Postal Archive" },
      createdAt: past49Hours
    });
    await deliveryEventsColl.insertOne({
      letterId,
      eventType: "LETTER_DELIVERED",
      metadata: { recipient: "recipient@example.com" },
      createdAt: past1Hour
    });
    console.log("[OLD-LETTERS Seed] Sample correspondence seeded successfully.");
  }
  console.log("[OLD-LETTERS Seed] Seeding completed.");
}
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase().then(() => {
    console.log("[OLD-LETTERS Seed] Ready.");
    process.exit(0);
  }).catch((err) => {
    console.error("[OLD-LETTERS Seed] Error:", err);
    process.exit(1);
  });
}

// src/lib/security.ts
function getClientIp(req) {
  if (req.ip) {
    return req.ip.replace(/^::ffff:/, "");
  }
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp.replace(/^::ffff:/, "");
  } else if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim().replace(/^::ffff:/, "");
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim().replace(/^::ffff:/, "");
  }
  return (req.socket?.remoteAddress || "127.0.0.1").replace(/^::ffff:/, "");
}
function validateMediaSignature(buffer) {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: "Media payload is too small or truncated." };
  }
  if (buffer[0] === 127 && buffer[1] === 69 && buffer[2] === 76 && buffer[3] === 70) {
    return { valid: false, error: "Executables and binary scripts are strictly prohibited." };
  }
  if (buffer[0] === 77 && buffer[1] === 90) {
    return { valid: false, error: "Executables and binary scripts are strictly prohibited." };
  }
  const headerUtf8 = buffer.slice(0, 128).toString("utf8").trim().toLowerCase();
  if (headerUtf8.startsWith("<?xml") || headerUtf8.startsWith("<svg") || headerUtf8.includes("<script") || headerUtf8.startsWith("<!doctype html") || headerUtf8.startsWith("<html")) {
    return { valid: false, error: "SVG, HTML and XML files are strictly prohibited." };
  }
  if (buffer[0] === 26 && buffer[1] === 69 && buffer[2] === 223 && buffer[3] === 163) {
    return { valid: true, detectedMime: "video/webm" };
  }
  if (buffer.length >= 12 && buffer.toString("utf8", 4, 8) === "ftyp") {
    return { valid: true, detectedMime: "video/mp4" };
  }
  if (buffer[0] === 79 && buffer[1] === 103 && buffer[2] === 103 && buffer[3] === 83) {
    return { valid: true, detectedMime: "audio/ogg" };
  }
  if (buffer.length >= 12 && buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WAVE") {
    return { valid: true, detectedMime: "audio/wav" };
  }
  if (buffer[0] === 73 && buffer[1] === 68 && buffer[2] === 51) {
    return { valid: true, detectedMime: "audio/mpeg" };
  }
  if (buffer[0] === 255 && (buffer[1] === 251 || buffer[1] === 243 || buffer[1] === 242)) {
    return { valid: true, detectedMime: "audio/mpeg" };
  }
  if (buffer[0] === 255 && (buffer[1] === 241 || buffer[1] === 249)) {
    return { valid: true, detectedMime: "audio/aac" };
  }
  if (buffer.length >= 8 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) {
    return { valid: true, detectedMime: "image/png" };
  }
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return { valid: true, detectedMime: "image/jpeg" };
  }
  if (buffer.length >= 12 && buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WEBP") {
    return { valid: true, detectedMime: "image/webp" };
  }
  return {
    valid: false,
    error: "Unsupported media format. Only authenticated recordings (WebM, MP4, WAV, OGG, MP3) and image enclosures (PNG, JPEG, WebP) are allowed."
  };
}
function validateScreenshotUrl(urlStr) {
  if (!urlStr || !urlStr.trim()) return { valid: true };
  const str = urlStr.trim();
  if (str.startsWith("data:")) {
    if (str.startsWith("data:image/svg") || str.includes("svg+xml")) {
      return { valid: false, error: "SVG screenshots are strictly prohibited." };
    }
    if (!str.startsWith("data:image/png;") && !str.startsWith("data:image/jpeg;") && !str.startsWith("data:image/webp;")) {
      return { valid: false, error: "Only PNG, JPEG, and WebP image attachments are supported." };
    }
    if (str.length > 20 * 1024 * 1024) {
      return { valid: false, error: "Payment screenshot image exceeds 15 MB limit." };
    }
    return { valid: true };
  }
  try {
    const parsed = new URL(str);
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Only secure HTTPS screenshot URLs are allowed." };
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "169.254.169.254" || host.endsWith(".internal") || host.endsWith(".local") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return { valid: false, error: "Private and internal network URLs are prohibited." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid screenshot URL format." };
  }
}

// src/lib/delivery.ts
function parseToMs(val) {
  if (val === null || val === void 0 || val === "") return null;
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? null : t;
  }
  if (typeof val === "number" && !isNaN(val)) {
    return val < 1e11 ? val * 1e3 : val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return num < 1e11 ? num * 1e3 : num;
    }
    const parsed = Date.parse(trimmed);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
function resolveDeliveryDate(letter) {
  if (!letter) {
    const now = Date.now();
    return { date: new Date(now), ms: now };
  }
  const candidateMs = parseToMs(letter.deliveryDate) ?? parseToMs(letter.scheduledDeliveryAt) ?? parseToMs(letter.createdAt) ?? Date.now();
  return { date: new Date(candidateMs), ms: candidateMs };
}

// server.ts
dotenv2.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.set("trust proxy", 1);
var PORT = parseInt(process.env.PORT || "3000", 10);
var isProd = process.env.NODE_ENV === "production";
var JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "old-letters-super-confidential-secret-key-1892";
var CRON_SECRET = process.env.CRON_SECRET || "old-letters-cron-secure-key-2026";
var getProductionAppUrl = () => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://oldletters.vercel.app";
  }
  return `http://localhost:${PORT}`;
};
var APP_URL = getProductionAppUrl();
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), interest-cohort=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: https://oldletters.vercel.app https://assets.watermelon.sh",
    "media-src 'self' blob: data:",
    "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com"
  ].join("; ");
  res.setHeader("Content-Security-Policy", cspDirectives);
  const origin = req.headers.origin;
  const isAllowedOrigin = !origin || origin === APP_URL || origin === "https://oldletters.vercel.app" || origin === "https://old-letters.vercel.app" || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || (origin.startsWith("https://old-letters-") || origin.startsWith("https://oldletters-")) && origin.endsWith(".vercel.app") || origin.includes(".run.app");
  if (origin && isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Recipient-Token");
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    if (origin && !isAllowedOrigin) {
      return res.status(403).json({ success: false, error: "Forbidden: Untrusted request origin." });
    }
  }
  const reqPathLower = (req.path || "").toLowerCase();
  if (reqPathLower.startsWith("/api") || reqPathLower.startsWith("/letter/") || reqPathLower.startsWith("/admin") || reqPathLower.startsWith("/bureau") || reqPathLower.startsWith("/profile") || reqPathLower.startsWith("/account") || reqPathLower.startsWith("/composer") || reqPathLower.startsWith("/archive") || reqPathLower.startsWith("/payment")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  const forwardedUri = req.headers["x-forwarded-uri"] || req.headers["x-matched-path"] || req.headers["x-invoke-path"];
  if (forwardedUri && forwardedUri.startsWith("/api") && !req.url.startsWith("/api")) {
    req.url = forwardedUri;
  } else if (!req.url.startsWith("/api") && (req.url.startsWith("/payments") || req.url.startsWith("/letters") || req.url.startsWith("/auth") || req.url.startsWith("/admin") || req.url.startsWith("/delivery") || req.url.startsWith("/user") || req.url.startsWith("/scheduler"))) {
    req.url = `/api${req.url}`;
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use("/api", (req, res, next) => {
  if (!req.path.includes("/auth/google") && !req.path.includes("/media/")) {
    res.setHeader("Content-Type", "application/json");
  }
  next();
});
var adminEmail = process.env.ADMIN_EMAIL || "admin@old-letters.in";
function hashSha2562(val) {
  return crypto2.createHash("sha256").update(val).digest("hex");
}
function getCookieSecurity(req) {
  if (process.env.NODE_ENV === "production") return true;
  if (req.secure) return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string" && forwardedProto.toLowerCase().includes("https")) return true;
  if (req.protocol === "https") return true;
  if (req.hostname && !req.hostname.includes("localhost") && !req.hostname.includes("127.0.0.1")) {
    return true;
  }
  return false;
}
function setSessionCookie(res, req, token) {
  const secure = getCookieSecurity(req);
  res.cookie("oldletters_session", token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 30 * 24 * 3600 * 1e3,
    path: "/"
  });
  res.cookie("oldletters_logged_in", "1", {
    httpOnly: false,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 30 * 24 * 3600 * 1e3,
    path: "/"
  });
}
function clearSessionCookie(res, req) {
  const secure = getCookieSecurity(req);
  res.clearCookie("oldletters_session", { path: "/", secure, sameSite: secure ? "none" : "lax" });
  res.clearCookie("oldletters_logged_in", { path: "/", secure, sameSite: secure ? "none" : "lax" });
}
var authenticateToken = (req, res, next) => {
  let token = req.cookies?.oldletters_session || req.cookies?.["oldletters_session"] || req.cookies?.token || req.cookies?.session;
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)(?:oldletters_session|token|session)=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1].trim());
    }
  }
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, "").trim();
  }
  if (!token && req.query && typeof req.query.token === "string") {
    token = req.query.token.trim();
  }
  if (token && typeof token === "string") {
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }
  }
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.id && (!decoded.scope || decoded.scope === "user_auth" || decoded.scope === "user_session")) {
      req.user = decoded;
    }
  } catch {
  }
  next();
};
app.use(authenticateToken);
var requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: "Authentication required. Please sign in to access your correspondence."
    });
  }
  next();
};
async function verifyAdminServerSide(req) {
  if (!req.user || !req.user.id || !req.user.email) {
    return false;
  }
  const cleanEmail = req.user.email.trim().toLowerCase();
  if (isAdminEmail(cleanEmail)) {
    return true;
  }
  if (isUserAdminRole(req.user.role)) {
    return true;
  }
  try {
    const db = await getDb();
    const usersColl = db.collection("users");
    let userDoc = null;
    if (ObjectId.isValid(req.user.id)) {
      userDoc = await usersColl.findOne({ _id: new ObjectId(req.user.id) });
    }
    if (!userDoc) {
      userDoc = await usersColl.findOne({ email: cleanEmail });
    }
    if (userDoc && isUserAdminRole(userDoc.role)) {
      return true;
    }
    const adminColl = db.collection("adminUsers");
    const adminRec = await adminColl.findOne({ email: cleanEmail });
    if (adminRec) {
      return true;
    }
  } catch (err) {
    console.warn("[OLD-LETTERS Admin verification warning]", err);
  }
  return false;
}
var requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.id || !req.user.email) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: "Authentication required. Please sign in to access bureau administrative controls."
    });
  }
  const isAdmin = await verifyAdminServerSide(req);
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Bureau administrative privileges required."
    });
  }
  next();
};
function setRateLimitHeaders(res, status) {
  res.setHeader("RateLimit-Limit", status.limit.toString());
  res.setHeader("RateLimit-Remaining", status.remaining.toString());
  res.setHeader("RateLimit-Reset", status.resetSeconds.toString());
  if (!status.allowed && status.retryAfterSeconds > 0) {
    res.setHeader("Retry-After", status.retryAfterSeconds.toString());
  }
}
async function checkDistributedRateLimit(req, res, key, limit = 5, windowMs = 15 * 60 * 1e3) {
  const status = await consumeDistributedRateLimit(key, limit, windowMs);
  setRateLimitHeaders(res, status);
  return status.allowed;
}
function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL?.trim() || `${APP_URL}/api/auth/google/callback`;
  return { clientId, clientSecret, callbackUrl };
}
var googleStrategyConfigured = false;
function ensureGoogleStrategy() {
  const { clientId, clientSecret, callbackUrl } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) {
    return false;
  }
  if (googleStrategyConfigured) {
    return true;
  }
  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: clientId,
          clientSecret,
          callbackURL: callbackUrl,
          proxy: true,
          passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) {
              return done(new Error("No email found in Google profile"), void 0);
            }
            let consentData = null;
            if (req.cookies?.oldletters_oauth_consent) {
              try {
                consentData = typeof req.cookies.oldletters_oauth_consent === "string" ? JSON.parse(req.cookies.oldletters_oauth_consent) : req.cookies.oldletters_oauth_consent;
              } catch {
              }
            }
            if (!consentData && req.query?.state) {
              try {
                const rawState = Buffer.from(String(req.query.state), "base64").toString("utf8");
                consentData = JSON.parse(rawState);
              } catch {
              }
            }
            const hasExplicitConsent = Boolean(
              consentData && consentData.termsAccepted === true && consentData.privacyAccepted === true
            );
            const db = await getDb();
            const usersColl = db.collection("users");
            const now = /* @__PURE__ */ new Date();
            let user = await usersColl.findOne({ googleId: profile.id });
            if (user) {
              const consentValid = hasExplicitConsent || user.termsAccepted && user.privacyAccepted && user.termsVersion === CURRENT_TERMS_VERSION;
              if (!consentValid) {
                return done(new Error("CONSENT_REQUIRED"), void 0);
              }
              const role = isAdminEmail(user.email) ? "ADMIN" : user.role || "USER";
              const updateFields = { lastLoginAt: now, updatedAt: now, role };
              if (hasExplicitConsent) {
                updateFields.termsAccepted = true;
                updateFields.privacyAccepted = true;
                updateFields.termsVersion = consentData.termsVersion || CURRENT_TERMS_VERSION;
                updateFields.privacyVersion = consentData.privacyVersion || CURRENT_PRIVACY_VERSION;
                updateFields.legalConsentAt = user.legalConsentAt || now;
              }
              await usersColl.updateOne({ _id: user._id }, { $set: updateFields });
              return done(null, {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                role,
                authProvider: user.authProvider || "GOOGLE",
                emailVerified: true
              });
            }
            user = await usersColl.findOne({ email });
            if (user) {
              const consentValid = hasExplicitConsent || user.termsAccepted && user.privacyAccepted && user.termsVersion === CURRENT_TERMS_VERSION;
              if (!consentValid) {
                return done(new Error("CONSENT_REQUIRED"), void 0);
              }
              const role = isAdminEmail(email) ? "ADMIN" : user.role || "USER";
              const updateFields = {
                googleId: profile.id,
                authProvider: "BOTH",
                emailVerified: true,
                lastLoginAt: now,
                updatedAt: now,
                role,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value
              };
              if (hasExplicitConsent) {
                updateFields.termsAccepted = true;
                updateFields.privacyAccepted = true;
                updateFields.termsVersion = consentData.termsVersion || CURRENT_TERMS_VERSION;
                updateFields.privacyVersion = consentData.privacyVersion || CURRENT_PRIVACY_VERSION;
                updateFields.legalConsentAt = user.legalConsentAt || now;
              }
              await usersColl.updateOne({ _id: user._id }, { $set: updateFields });
              return done(null, {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                role,
                authProvider: "BOTH",
                emailVerified: true
              });
            }
            if (!hasExplicitConsent) {
              return done(new Error("CONSENT_REQUIRED"), void 0);
            }
            const newUserId = new ObjectId();
            const newUserRole = isAdminEmail(email) ? "ADMIN" : "USER";
            const newUser = {
              _id: newUserId,
              email,
              fullName: profile.displayName || email.split("@")[0],
              avatarUrl: profile.photos?.[0]?.value,
              authProvider: "GOOGLE",
              googleId: profile.id,
              role: newUserRole,
              emailVerified: true,
              termsAccepted: true,
              privacyAccepted: true,
              termsVersion: consentData.termsVersion || CURRENT_TERMS_VERSION,
              privacyVersion: consentData.privacyVersion || CURRENT_PRIVACY_VERSION,
              legalConsentAt: now,
              createdAt: now,
              updatedAt: now,
              lastLoginAt: now
            };
            await usersColl.insertOne(newUser);
            return done(null, {
              id: newUserId.toString(),
              email: newUser.email,
              fullName: newUser.fullName,
              avatarUrl: newUser.avatarUrl,
              role: newUser.role,
              authProvider: "GOOGLE",
              emailVerified: true
            });
          } catch (err) {
            return done(err, void 0);
          }
        }
      )
    );
    googleStrategyConfigured = true;
    return true;
  } catch (err) {
    console.error("[Google OAuth Setup Error]", err);
    return false;
  }
}
ensureGoogleStrategy();
app.get("/api/health", async (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    backend: "mongodb-atlas",
    atlasConnected: isUsingAtlas(),
    emailConfigured: isEmailConfigured(),
    googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    database: "MongoDB Atlas Protocol"
  });
});
app.get("/api/config/payment", (req, res) => {
  res.json({
    upiId: process.env.UPI_ID || "oldletters@okhdfcbank",
    upiDisplayName: process.env.UPI_DISPLAY_NAME || "OLD-LETTERS CORRESPONDENCE",
    paymentQrUrl: process.env.PAYMENT_QR_URL || "/assets/upi-qr.png"
  });
});
app.get(["/api/auth/me", "/api/me", "/auth/me"], async (req, res) => {
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  if (!req.user || !req.user.id) {
    return res.json({ authenticated: false, user: null });
  }
  let userDoc = null;
  let lettersCount = 0;
  try {
    const db = await getDb();
    const usersColl = db.collection("users");
    const lettersColl = db.collection("letters");
    if (req.user.id) {
      try {
        if (ObjectId.isValid(req.user.id)) {
          userDoc = await usersColl.findOne({ _id: new ObjectId(req.user.id) });
        }
      } catch {
      }
      if (!userDoc) {
        try {
          userDoc = await usersColl.findOne({ _id: req.user.id });
        } catch {
        }
      }
    }
    if (!userDoc && req.user.email) {
      try {
        userDoc = await usersColl.findOne({ email: req.user.email.toLowerCase() });
      } catch {
      }
    }
    if (!userDoc && req.user.email) {
      try {
        const now = /* @__PURE__ */ new Date();
        const restoredUser = {
          _id: req.user.id && ObjectId.isValid(req.user.id) ? new ObjectId(req.user.id) : new ObjectId(),
          email: req.user.email.toLowerCase(),
          fullName: req.user.fullName || req.user.email.split("@")[0] || "Correspondent",
          avatarUrl: req.user.avatarUrl,
          role: req.user.role || (isAdminEmail(req.user.email) ? "ADMIN" : "USER"),
          authProvider: req.user.authProvider || "GOOGLE",
          emailVerified: req.user.emailVerified ?? true,
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          legalConsentAt: now,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now
        };
        await usersColl.insertOne(restoredUser);
        userDoc = restoredUser;
      } catch {
      }
    }
    if (userDoc && isAdminEmail(userDoc.email) && userDoc.role !== "ADMIN") {
      try {
        await usersColl.updateOne({ _id: userDoc._id }, { $set: { role: "ADMIN" } });
        userDoc.role = "ADMIN";
      } catch {
      }
    }
    if (lettersColl) {
      try {
        lettersCount = await lettersColl.countDocuments({
          $or: [
            { senderId: userDoc?._id?.toString() || req.user.id },
            { senderId: userDoc?._id || req.user.id },
            { senderEmail: req.user.email }
          ]
        });
      } catch {
      }
    }
  } catch (err) {
    console.warn("[OLD-LETTERS auth/me notice]:", err);
  }
  const effectiveRole = userDoc?.role === "ADMIN" || isAdminEmail(userDoc?.email || req.user.email) ? "ADMIN" : userDoc?.role || req.user.role || "USER";
  const resolvedUser = {
    id: userDoc?._id ? userDoc._id.toString() : req.user.id,
    email: userDoc?.email || req.user.email,
    fullName: userDoc?.fullName || req.user.fullName || req.user.email?.split("@")[0] || "Correspondent",
    avatarUrl: userDoc?.avatarUrl || req.user.avatarUrl,
    role: effectiveRole,
    authProvider: userDoc?.authProvider || req.user.authProvider || "GOOGLE",
    emailVerified: userDoc?.emailVerified ?? req.user.emailVerified ?? true,
    googleLinked: !!userDoc?.googleId || req.user.authProvider === "GOOGLE" || req.user.authProvider === "BOTH",
    termsAccepted: userDoc?.termsAccepted ?? false,
    privacyAccepted: userDoc?.privacyAccepted ?? false,
    termsVersion: userDoc?.termsVersion || void 0,
    privacyVersion: userDoc?.privacyVersion || void 0,
    legalConsentAt: userDoc?.legalConsentAt ? typeof userDoc.legalConsentAt === "string" ? userDoc.legalConsentAt : userDoc.legalConsentAt.toISOString() : void 0,
    createdAt: userDoc?.createdAt ? typeof userDoc.createdAt === "string" ? userDoc.createdAt : userDoc.createdAt.toISOString() : void 0,
    lettersCount
  };
  return res.json({
    authenticated: true,
    user: resolvedUser
  });
});
app.post(["/api/auth/register", "/api/auth/signup", "/auth/register", "/auth/signup"], async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    const fullName = String(req.body.fullName || "").trim() || "Correspondent";
    const termsAccepted = req.body.termsAccepted === true || req.body.termsAccepted === "true";
    const privacyAccepted = req.body.privacyAccepted === true || req.body.privacyAccepted === "true";
    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        success: false,
        error: "You must agree to the Terms of Service and Privacy Policy to create an account."
      });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email address is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:register:${clientIp}`, 25, 15 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many registration attempts from this network. Please try again later." });
    }
    const emailAllowed = await checkDistributedRateLimit(req, res, `register:${email}`, 6, 15 * 60 * 1e3);
    if (!emailAllowed) {
      return res.status(429).json({ success: false, error: "Too many registration attempts. Please try again later." });
    }
    const db = await getDb();
    const usersColl = db.collection("users");
    const existing = await usersColl.findOne({ email });
    const passwordHash = await bcrypt2.hash(password, 10);
    const now = /* @__PURE__ */ new Date();
    if (existing) {
      if (existing.authProvider === "GOOGLE" && !existing.passwordHash) {
        await usersColl.updateOne(
          { _id: existing._id },
          {
            $set: {
              passwordHash,
              authProvider: "BOTH",
              fullName: existing.fullName || fullName,
              termsAccepted: true,
              privacyAccepted: true,
              termsVersion: req.body.termsVersion || CURRENT_TERMS_VERSION,
              privacyVersion: req.body.privacyVersion || CURRENT_PRIVACY_VERSION,
              legalConsentAt: existing.legalConsentAt || now,
              updatedAt: now,
              lastLoginAt: now
            }
          }
        );
        const userPayload2 = {
          id: existing._id.toString(),
          email: existing.email,
          fullName: existing.fullName || fullName,
          role: isAdminEmail(existing.email) ? "ADMIN" : existing.role || "USER",
          authProvider: "BOTH",
          emailVerified: true,
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: req.body.termsVersion || CURRENT_TERMS_VERSION,
          privacyVersion: req.body.privacyVersion || CURRENT_PRIVACY_VERSION
        };
        const sessionToken2 = jwt.sign(userPayload2, JWT_SECRET, { expiresIn: "30d" });
        setSessionCookie(res, req, sessionToken2);
        return res.json({ success: true, token: sessionToken2, user: userPayload2 });
      }
      return res.status(400).json({ success: false, error: "An account with this email already exists." });
    }
    const newUserId = new ObjectId();
    const newUserRole = isAdminEmail(email) ? "ADMIN" : "USER";
    const newUser = {
      _id: newUserId,
      fullName,
      email,
      passwordHash,
      authProvider: "EMAIL",
      role: newUserRole,
      emailVerified: false,
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: req.body.termsVersion || CURRENT_TERMS_VERSION,
      privacyVersion: req.body.privacyVersion || CURRENT_PRIVACY_VERSION,
      legalConsentAt: now,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    };
    await usersColl.insertOne(newUser);
    const userPayload = {
      id: newUserId.toString(),
      email,
      fullName,
      role: newUser.role,
      authProvider: "EMAIL",
      emailVerified: false,
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: newUser.termsVersion,
      privacyVersion: newUser.privacyVersion
    };
    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "30d" });
    setSessionCookie(res, req, sessionToken);
    res.json({ success: true, token: sessionToken, user: userPayload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required." });
    }
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:login:${clientIp}`, 30, 15 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many login attempts from this network. Please try again later." });
    }
    const emailAllowed = await checkDistributedRateLimit(req, res, `login:${email}`, 10, 15 * 60 * 1e3);
    if (!emailAllowed) {
      return res.status(429).json({ success: false, error: "Too many login attempts. Please wait 15 minutes." });
    }
    const db = await getDb();
    const usersColl = db.collection("users");
    const user = await usersColl.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }
    const isValid = await bcrypt2.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }
    const now = /* @__PURE__ */ new Date();
    let userRole = user.role || "USER";
    if (isAdminEmail(email)) {
      userRole = "ADMIN";
      await usersColl.updateOne(
        { _id: user._id },
        { $set: { role: "ADMIN", lastLoginAt: now, updatedAt: now } }
      );
    } else {
      await usersColl.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });
    }
    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: userRole,
      authProvider: user.authProvider || "EMAIL",
      emailVerified: user.emailVerified ?? false,
      termsAccepted: user.termsAccepted ?? false,
      privacyAccepted: user.privacyAccepted ?? false,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion
    };
    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "30d" });
    setSessionCookie(res, req, sessionToken);
    res.json({ success: true, token: sessionToken, user: userPayload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get(["/api/auth/google", "/auth/google"], (req, res, next) => {
  const isConfigured = ensureGoogleStrategy();
  if (!isConfigured) {
    if (req.accepts("html")) {
      return res.redirect("/?auth=google_not_configured");
    }
    return res.status(503).json({
      success: false,
      error: "Google sign-in is not configured yet. Please use email and password."
    });
  }
  const consentGiven = req.query.consent === "true" || req.query.consent === "1";
  if (!consentGiven) {
    if (req.accepts("html")) {
      return res.redirect("/?auth=consent_required");
    }
    return res.status(400).json({
      success: false,
      error: "Consent to Terms of Service and Privacy Policy is required before continuing with Google."
    });
  }
  const consentPayload = {
    termsAccepted: true,
    privacyAccepted: true,
    termsVersion: req.query.termsVersion || CURRENT_TERMS_VERSION,
    privacyVersion: req.query.privacyVersion || CURRENT_PRIVACY_VERSION,
    timestamp: Date.now()
  };
  res.cookie("oldletters_oauth_consent", JSON.stringify(consentPayload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1e3
  });
  const state = Buffer.from(JSON.stringify(consentPayload)).toString("base64");
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state
  })(req, res, next);
});
app.get(["/api/auth/google/callback", "/auth/google/callback"], (req, res, next) => {
  const isConfigured = ensureGoogleStrategy();
  if (!isConfigured) {
    if (req.accepts("html")) {
      return res.redirect("/?auth=google_not_configured");
    }
    return res.status(503).json({
      success: false,
      error: "Google sign-in is not configured yet. Please use email and password."
    });
  }
  passport.authenticate("google", { session: false }, (err, user) => {
    res.clearCookie("oldletters_oauth_consent");
    if (err || !user) {
      if (err?.message === "CONSENT_REQUIRED") {
        if (req.accepts("html")) {
          return res.redirect("/?auth=consent_required");
        }
        return res.status(400).json({
          success: false,
          error: "You must agree to the Terms of Service and Privacy Policy before continuing with Google."
        });
      }
      console.error("[Google OAuth Error]", err);
      if (req.accepts("html")) {
        return res.redirect("/?auth=error");
      }
      return res.status(401).json({
        success: false,
        error: "Google authentication failed. Please try again."
      });
    }
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
    setSessionCookie(res, req, token);
    const safeUser = {
      id: user.id || user._id?.toString(),
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role || "USER",
      authProvider: user.authProvider || "GOOGLE",
      emailVerified: true,
      termsAccepted: user.termsAccepted ?? true,
      privacyAccepted: user.privacyAccepted ?? true,
      termsVersion: user.termsVersion || CURRENT_TERMS_VERSION,
      privacyVersion: user.privacyVersion || CURRENT_PRIVACY_VERSION
    };
    const userParam = encodeURIComponent(JSON.stringify(safeUser));
    res.redirect(`/?auth=google_success&token=${encodeURIComponent(token)}&u=${userParam}`);
  })(req, res, next);
});
app.post(["/api/auth/consent", "/auth/consent"], async (req, res) => {
  try {
    const userPayload = req.user;
    if (!userPayload || !userPayload.id) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const { termsAccepted, privacyAccepted, termsVersion, privacyVersion } = req.body;
    if (termsAccepted !== true || privacyAccepted !== true) {
      return res.status(400).json({ success: false, error: "Terms and Privacy must both be accepted." });
    }
    const db = await getDb();
    const usersColl = db.collection("users");
    const now = /* @__PURE__ */ new Date();
    await usersColl.updateOne(
      { _id: new ObjectId(userPayload.id) },
      {
        $set: {
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: termsVersion || CURRENT_TERMS_VERSION,
          privacyVersion: privacyVersion || CURRENT_PRIVACY_VERSION,
          legalConsentAt: now,
          updatedAt: now
        }
      }
    );
    res.json({ success: true, message: "Legal consent updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/google/test-login", async (req, res) => {
  try {
    const {
      email,
      googleId,
      fullName,
      avatarUrl,
      termsAccepted,
      privacyAccepted,
      termsVersion,
      privacyVersion
    } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ success: false, error: "Email and googleId required for verification." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();
    const usersColl = db.collection("users");
    const now = /* @__PURE__ */ new Date();
    let user = await usersColl.findOne({ googleId });
    if (!user) {
      user = await usersColl.findOne({ email: cleanEmail });
    }
    const hasExplicitConsent = termsAccepted === true && privacyAccepted === true;
    if (!user && !hasExplicitConsent) {
      return res.status(400).json({
        success: false,
        error: "You must agree to the Terms of Service and Privacy Policy before creating an account with Google."
      });
    }
    if (user) {
      const role = isAdminEmail(cleanEmail) ? "ADMIN" : user.role || "USER";
      const updateFields = {
        lastLoginAt: now,
        updatedAt: now,
        googleId,
        role,
        authProvider: user.passwordHash ? "BOTH" : "GOOGLE",
        avatarUrl: user.avatarUrl || avatarUrl
      };
      if (hasExplicitConsent) {
        updateFields.termsAccepted = true;
        updateFields.privacyAccepted = true;
        updateFields.termsVersion = termsVersion || CURRENT_TERMS_VERSION;
        updateFields.privacyVersion = privacyVersion || CURRENT_PRIVACY_VERSION;
        updateFields.legalConsentAt = user.legalConsentAt || now;
      }
      await usersColl.updateOne({ _id: user._id }, { $set: updateFields });
      user = await usersColl.findOne({ _id: user._id });
    } else {
      const newUserId = new ObjectId();
      const newUserRole = isAdminEmail(cleanEmail) ? "ADMIN" : "USER";
      const newUser = {
        _id: newUserId,
        email: cleanEmail,
        fullName: fullName || cleanEmail.split("@")[0],
        avatarUrl,
        authProvider: "GOOGLE",
        googleId,
        role: newUserRole,
        emailVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: termsVersion || CURRENT_TERMS_VERSION,
        privacyVersion: privacyVersion || CURRENT_PRIVACY_VERSION,
        legalConsentAt: now,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      };
      await usersColl.insertOne(newUser);
      user = newUser;
    }
    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: isAdminEmail(cleanEmail) ? "ADMIN" : user.role || "USER",
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
      termsAccepted: user.termsAccepted ?? true,
      privacyAccepted: user.privacyAccepted ?? true,
      termsVersion: user.termsVersion || CURRENT_TERMS_VERSION,
      privacyVersion: user.privacyVersion || CURRENT_PRIVACY_VERSION
    };
    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "30d" });
    setSessionCookie(res, req, sessionToken);
    res.json({ success: true, user: userPayload, token: sessionToken });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/auth/logout", "/auth/logout"], (req, res) => {
  clearSessionCookie(res, req);
  res.json({ success: true, message: "Logged out successfully." });
});
app.get(["/api/user/bureau-summary", "/api/bureau/summary"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const recipientsColl = db.collection("letterRecipients");
    const paymentsColl = db.collection("payments");
    const usersColl = db.collection("users");
    const userId = req.user.id;
    const userEmail = (req.user.email || "").toLowerCase();
    const sentCount = await lettersColl.countDocuments({
      $or: [
        { senderId: userId },
        ...ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : [],
        { senderEmail: userEmail }
      ]
    });
    const recipientRecords = await recipientsColl.find({ email: userEmail }).toArray();
    const recipientLetterIds = recipientRecords.map((r) => r.letterId);
    const receivedCount = await lettersColl.countDocuments({
      $or: [
        { recipientEmail: userEmail },
        ...recipientLetterIds.length > 0 ? [{ _id: { $in: recipientLetterIds.map((id) => typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : id) } }] : []
      ]
    });
    const now = /* @__PURE__ */ new Date();
    const sentInTransit = await lettersColl.countDocuments({
      $or: [
        { senderId: userId },
        ...ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : [],
        { senderEmail: userEmail }
      ],
      status: { $in: ["SCHEDULED", "IN_TRANSIT"] },
      deliveryDate: { $gt: now }
    });
    const receivedInTransit = await lettersColl.countDocuments({
      $or: [
        { recipientEmail: userEmail },
        ...recipientLetterIds.length > 0 ? [{ _id: { $in: recipientLetterIds.map((id) => typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : id) } }] : []
      ],
      deliveryDate: { $gt: now }
    });
    const inTransitCount = sentInTransit + receivedInTransit;
    const sentDelivered = await lettersColl.countDocuments({
      $or: [
        { senderId: userId },
        ...ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : [],
        { senderEmail: userEmail }
      ],
      status: { $in: ["DELIVERED", "OPENED"] }
    });
    const receivedDelivered = await lettersColl.countDocuments({
      $or: [
        { recipientEmail: userEmail },
        ...recipientLetterIds.length > 0 ? [{ _id: { $in: recipientLetterIds.map((id) => typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : id) } }] : []
      ],
      status: { $in: ["DELIVERED", "OPENED"] }
    });
    const deliveredCount = sentDelivered + receivedDelivered;
    const payments = await paymentsColl.find({
      $or: [
        { userId },
        ...ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []
      ],
      status: { $in: ["APPROVED", "PAID"] }
    }).toArray();
    const totalSpent = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    let userDoc = null;
    if (ObjectId.isValid(userId)) {
      userDoc = await usersColl.findOne({ _id: new ObjectId(userId) });
    }
    if (!userDoc) {
      userDoc = await usersColl.findOne({ email: userEmail });
    }
    res.json({
      success: true,
      stats: {
        sentCount,
        receivedCount,
        inTransitCount,
        deliveredCount,
        totalSpent
      },
      user: {
        id: userDoc?._id ? userDoc._id.toString() : userId,
        email: userDoc?.email || req.user.email,
        fullName: userDoc?.fullName || req.user.fullName || req.user.email?.split("@")[0] || "Correspondent",
        avatarUrl: userDoc?.avatarUrl || req.user.avatarUrl,
        role: userDoc?.role || req.user.role || "USER",
        authProvider: userDoc?.authProvider || req.user.authProvider || "EMAIL",
        googleLinked: !!userDoc?.googleId || req.user.authProvider === "GOOGLE" || req.user.authProvider === "BOTH",
        status: userDoc?.status || "ACTIVE",
        termsAccepted: userDoc?.termsAccepted ?? true,
        privacyAccepted: userDoc?.privacyAccepted ?? true,
        termsVersion: userDoc?.termsVersion || CURRENT_TERMS_VERSION,
        privacyVersion: userDoc?.privacyVersion || CURRENT_PRIVACY_VERSION,
        legalConsentAt: userDoc?.legalConsentAt ? typeof userDoc.legalConsentAt === "string" ? userDoc.legalConsentAt : userDoc.legalConsentAt.toISOString() : userDoc?.createdAt ? typeof userDoc.createdAt === "string" ? userDoc.createdAt : userDoc.createdAt.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: userDoc?.createdAt ? typeof userDoc.createdAt === "string" ? userDoc.createdAt : userDoc.createdAt.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        hasPassword: !!userDoc?.passwordHash,
        notificationPreferences: userDoc?.notificationPreferences || {
          letterDispatched: true,
          deliveryUpdates: true,
          preArrival: true,
          arrival: true,
          paymentUpdates: true
        }
      }
    });
  } catch (err) {
    console.error("Error fetching bureau summary:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put(["/api/user/profile", "/api/profile"], requireAuth, async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const avatarUrl = req.body.avatarUrl !== void 0 ? String(req.body.avatarUrl).trim() : void 0;
    if (!fullName) {
      return res.status(400).json({ success: false, error: "Full name cannot be blank." });
    }
    const db = await getDb();
    const usersColl = db.collection("users");
    const userId = req.user.id;
    const updateFields = {
      fullName,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (avatarUrl !== void 0) {
      updateFields.avatarUrl = avatarUrl;
    }
    let filter = { _id: userId };
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }
    await usersColl.updateOne(filter, { $set: updateFields });
    req.user.fullName = fullName;
    if (avatarUrl !== void 0) req.user.avatarUrl = avatarUrl;
    const updatedUserPayload = {
      id: userId,
      email: req.user.email,
      fullName,
      avatarUrl: avatarUrl !== void 0 ? avatarUrl : req.user.avatarUrl,
      role: req.user.role,
      authProvider: req.user.authProvider
    };
    const sessionToken = jwt.sign(updatedUserPayload, JWT_SECRET, { expiresIn: "30d" });
    setSessionCookie(res, req, sessionToken);
    res.json({
      success: true,
      message: "Correspondent profile updated.",
      user: {
        id: userId,
        email: req.user.email,
        fullName,
        avatarUrl: avatarUrl !== void 0 ? avatarUrl : req.user.avatarUrl,
        role: req.user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put(["/api/user/preferences", "/api/preferences"], requireAuth, async (req, res) => {
  try {
    const prefs = req.body.preferences || req.body;
    if (!prefs || typeof prefs !== "object") {
      return res.status(400).json({ success: false, error: "Invalid preferences format." });
    }
    const validPrefs = {
      letterDispatched: prefs.letterDispatched !== false,
      deliveryUpdates: prefs.deliveryUpdates !== false,
      preArrival: prefs.preArrival !== false,
      arrival: prefs.arrival !== false,
      paymentUpdates: prefs.paymentUpdates !== false
    };
    const db = await getDb();
    const usersColl = db.collection("users");
    const userId = req.user.id;
    let filter = { _id: userId };
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }
    await usersColl.updateOne(filter, {
      $set: {
        notificationPreferences: validPrefs,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.json({
      success: true,
      message: "Notification preferences recorded in Bureau registry.",
      preferences: validPrefs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put(["/api/user/password", "/api/password"], requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters long." });
    }
    const db = await getDb();
    const usersColl = db.collection("users");
    const userId = req.user.id;
    let user = null;
    if (ObjectId.isValid(userId)) {
      user = await usersColl.findOne({ _id: new ObjectId(userId) });
    }
    if (!user) {
      user = await usersColl.findOne({ email: req.user.email.toLowerCase() });
    }
    if (!user) {
      return res.status(404).json({ success: false, error: "Correspondent account not found." });
    }
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: "Current password is required to change password." });
      }
      const isMatch = await bcrypt2.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Current password does not match our records." });
      }
    }
    const newHash = await bcrypt2.hash(newPassword, 10);
    await usersColl.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newHash,
          authProvider: user.authProvider === "GOOGLE" ? "BOTH" : user.authProvider,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }
    );
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get(["/api/user/export-data", "/api/export-data"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const usersColl = db.collection("users");
    const lettersColl = db.collection("letters");
    const paymentsColl = db.collection("payments");
    const userId = req.user.id;
    const userEmail = (req.user.email || "").toLowerCase();
    let userDoc = null;
    if (ObjectId.isValid(userId)) {
      userDoc = await usersColl.findOne({ _id: new ObjectId(userId) });
    }
    if (!userDoc) {
      userDoc = await usersColl.findOne({ email: userEmail });
    }
    const sentLetters = await lettersColl.find({
      $or: [
        { senderId: userId },
        ...ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : [],
        { senderEmail: userEmail }
      ]
    }).sort({ createdAt: -1 }).toArray();
    const receivedLetters = await lettersColl.find({
      recipientEmail: userEmail
    }).sort({ createdAt: -1 }).toArray();
    const payments = await paymentsColl.find({
      $or: [
        { userId },
        ...ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []
      ]
    }).sort({ createdAt: -1 }).toArray();
    const exportPayload = {
      exportMetadata: {
        service: "OLD-LETTERS Correspondence Bureau",
        registryReference: `OL-EXP-${userId.slice(-6).toUpperCase()}`,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      profile: {
        id: userId,
        fullName: userDoc?.fullName || req.user.fullName,
        email: userEmail,
        authProvider: userDoc?.authProvider || req.user.authProvider,
        enrolledAt: userDoc?.createdAt || null,
        legalConsent: {
          termsAccepted: userDoc?.termsAccepted ?? true,
          privacyAccepted: userDoc?.privacyAccepted ?? true,
          termsVersion: userDoc?.termsVersion || CURRENT_TERMS_VERSION,
          privacyVersion: userDoc?.privacyVersion || CURRENT_PRIVACY_VERSION,
          consentedAt: userDoc?.legalConsentAt || userDoc?.createdAt || null
        },
        notificationPreferences: userDoc?.notificationPreferences || {
          letterDispatched: true,
          deliveryUpdates: true,
          preArrival: true,
          arrival: true,
          paymentUpdates: true
        }
      },
      summary: {
        sentLettersCount: sentLetters.length,
        receivedLettersCount: receivedLetters.length,
        paymentsCount: payments.length
      },
      sentLetters: sentLetters.map((l) => ({
        trackingCode: l.trackingCode,
        type: l.letterType,
        recipientName: l.recipientName,
        recipientEmail: l.recipientEmail ? l.recipientEmail.replace(/(?<=.).(?=.*@)/g, "*") : void 0,
        letterDate: l.letterDate || (l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-US") : void 0),
        postedAt: l.postedAt,
        scheduledDeliveryAt: l.deliveryDate,
        deliveredAt: l.deliveredAt,
        status: l.status,
        waitingHours: l.waitingHours,
        postmarkCity: l.postmarkCity
      })),
      receivedLetters: receivedLetters.map((l) => ({
        trackingCode: l.trackingCode,
        type: l.letterType,
        senderName: l.senderName,
        letterDate: l.letterDate || (l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-US") : void 0),
        scheduledDeliveryAt: l.deliveryDate,
        deliveredAt: l.deliveredAt,
        status: l.status,
        postmarkCity: l.postmarkCity
      })),
      payments: payments.map((p) => ({
        paymentId: `PAY-${p._id.toString().slice(-8).toUpperCase()}`,
        featureCode: p.featureCode,
        amount: p.amount,
        currency: p.currency || "INR",
        upiReference: p.upiReference,
        status: p.status,
        date: p.createdAt
      }))
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="old-letters-bureau-${userId.slice(-6)}.json"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete(["/api/user/account", "/api/account"], requireAuth, async (req, res) => {
  try {
    const confirmation = String(req.body.confirmation || "").trim();
    if (confirmation !== "DELETE MY BUREAU") {
      return res.status(400).json({
        success: false,
        error: 'Confirmation phrase must be exactly "DELETE MY BUREAU" to close this Bureau account.'
      });
    }
    const db = await getDb();
    const usersColl = db.collection("users");
    const userId = req.user.id;
    let filter = { _id: userId };
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }
    await usersColl.updateOne(filter, {
      $set: {
        status: "DELETED",
        passwordHash: void 0,
        fullName: "Closed Correspondent",
        email: `deleted_${Date.now()}_${req.user.email}`,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    clearSessionCookie(res, req);
    res.json({
      success: true,
      message: "Your Bureau account and correspondent records have been closed."
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/request-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address required." });
    }
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:auth_otp:${clientIp}`, 15, 15 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many verification code requests from this network." });
    }
    const emailAllowed = await checkDistributedRateLimit(req, res, `auth_otp:${email}`, 5, 15 * 60 * 1e3);
    if (!emailAllowed) {
      return res.status(429).json({ success: false, error: "Too many OTP requests. Please wait 15 minutes." });
    }
    const db = await getDb();
    const otpColl = db.collection("otpCodes");
    await otpColl.updateOne({ email, used: false }, { $set: { used: true } });
    const otpCode = crypto2.randomInt(1e5, 999999).toString();
    const otpHash = hashSha2562(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    await otpColl.insertOne({
      _id: new ObjectId(),
      email,
      otpHash,
      attempts: 0,
      expiresAt,
      used: false,
      createdAt: /* @__PURE__ */ new Date()
    });
    if (isEmailConfigured()) {
      await sendMail({
        to: email,
        subject: "Your OLD-LETTERS Bureau Access Code",
        html: `
          <div style="background-color: #faf9f7; padding: 40px; font-family: serif; color: #134e4a; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 36px; border-radius: 4px;">
              <div style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #78716c; margin-bottom: 12px; font-family: monospace;">
                OLD-LETTERS BUREAU AUTHENTICATION
              </div>
              <h2 style="font-size: 24px; font-weight: 300; margin: 0 0 16px 0; color: #134e4a;">Correspondence Sign-in</h2>
              <p style="font-size: 14px; font-family: sans-serif; color: #57534e; margin-bottom: 24px;">
                Use the following single-use code to authenticate your session. Valid for 10 minutes.
              </p>
              <div style="font-size: 34px; font-family: monospace; letter-spacing: 0.3em; font-weight: bold; background: #faf9f7; padding: 16px; border: 1px dashed #134e4a; color: #134e4a; margin: 24px 0;">
                ${otpCode}
              </div>
            </div>
          </div>
        `
      });
    }
    const isProdEnv = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    res.json({
      success: true,
      message: "Access code sent to email.",
      devOtpHint: !isEmailConfigured() && !isProdEnv ? otpCode : void 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const fullName = String(req.body.fullName || "").trim();
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and OTP code are required." });
    }
    const db = await getDb();
    const otpColl = db.collection("otpCodes");
    const usersColl = db.collection("users");
    const activeOtp = await otpColl.findOne({
      email,
      used: false,
      expiresAt: { $gte: /* @__PURE__ */ new Date() }
    });
    if (!activeOtp) {
      return res.status(400).json({ success: false, error: "Invalid or expired verification code." });
    }
    if (activeOtp.attempts >= 5) {
      await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });
      return res.status(429).json({ success: false, error: "Maximum verification attempts exceeded." });
    }
    const inputHash = hashSha2562(otp);
    if (inputHash !== activeOtp.otpHash) {
      await otpColl.updateOne({ _id: activeOtp._id }, { $inc: { attempts: 1 } });
      return res.status(401).json({ success: false, error: "Incorrect verification code." });
    }
    await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });
    let user = await usersColl.findOne({ email });
    const now = /* @__PURE__ */ new Date();
    if (!user) {
      const defaultName = fullName || email.split("@")[0].replace(/[._-]/g, " ");
      const newUserId = new ObjectId();
      const newUserRole = isAdminEmail(email) ? "ADMIN" : "USER";
      await usersColl.insertOne({
        _id: newUserId,
        fullName: defaultName,
        email,
        authProvider: "EMAIL",
        role: newUserRole,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      });
      user = await usersColl.findOne({ _id: newUserId });
    } else if (isAdminEmail(email) && user.role !== "ADMIN") {
      await usersColl.updateOne({ _id: user._id }, { $set: { role: "ADMIN" } });
      user.role = "ADMIN";
    }
    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: isAdminEmail(email) ? "ADMIN" : user.role || "USER",
      authProvider: user.authProvider,
      emailVerified: true
    };
    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "30d" });
    setSessionCookie(res, req, sessionToken);
    res.json({
      success: true,
      token: sessionToken,
      user: userPayload
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/templates", async (req, res) => {
  try {
    const db = await getDb();
    const templatesColl = db.collection("letterTemplates");
    const templates = await (await templatesColl.find({ isActive: true })).sort({ sortOrder: 1 }).toArray();
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
async function mapLetterDocToResponse(ltr, db, reqUser) {
  const recipientsColl = db.collection("letterRecipients");
  const recipient = await recipientsColl.findOne({
    $or: [{ letterId: ltr._id }, { letterId: ltr._id.toString() }]
  });
  const paymentsColl = db.collection("payments");
  let payment = null;
  try {
    payment = await paymentsColl.findOne({
      $or: [
        { letterId: ltr._id.toString() },
        { letterId: ltr._id },
        ...ltr.trackingCode ? [{ letterId: ltr.trackingCode }] : []
      ]
    });
  } catch {
  }
  const tokensColl = db.collection("deliveryTokens");
  let deliveryToken = void 0;
  try {
    const tokenDoc = await tokensColl.findOne({
      $or: [
        { letterId: ltr._id },
        { letterId: ltr._id.toString() },
        ...ObjectId.isValid(ltr._id) ? [{ letterId: new ObjectId(ltr._id) }] : []
      ]
    });
    if (tokenDoc?.rawToken) {
      deliveryToken = tokenDoc.rawToken;
    } else if (tokenDoc?.tokenHash) {
      deliveryToken = tokenDoc.tokenHash;
    } else {
      deliveryToken = ltr.trackingCode || ltr._id.toString();
    }
  } catch {
    deliveryToken = ltr.trackingCode || ltr._id.toString();
  }
  const rawRecipientEmail = ltr.recipientEmail || recipient?.email || "";
  const recipientEmailMasked = rawRecipientEmail ? rawRecipientEmail.replace(/(?<=.).(?=.*@)/g, "*") : "***@***.com";
  const now = Date.now();
  const createdAtTime = ltr.createdAt ? new Date(ltr.createdAt).getTime() : now;
  const postedAtTime = ltr.postedAt ? new Date(ltr.postedAt).getTime() : createdAtTime;
  const deliveryDateTime = ltr.deliveryDate ? new Date(ltr.deliveryDate).getTime() : postedAtTime + 48 * 3600 * 1e3;
  const deliveredAtTime = ltr.deliveredAt ? new Date(ltr.deliveredAt).getTime() : void 0;
  const isWritten = true;
  const isSealed = ltr.status !== "DRAFT";
  const isDispatched = ltr.status !== "DRAFT";
  const isInTransit = ["IN_TRANSIT", "DELIVERED", "OPENED"].includes(ltr.status) || ltr.status === "SCHEDULED" && now >= postedAtTime;
  const isArriving = ["DELIVERED", "OPENED"].includes(ltr.status) || now >= deliveryDateTime - 24 * 3600 * 1e3;
  const isDelivered = ltr.status === "DELIVERED" || ltr.status === "OPENED" || now >= deliveryDateTime && ltr.status !== "DRAFT" && ltr.status !== "CANCELLED";
  const timeline = [
    {
      step: "WRITTEN",
      label: "Written",
      timestamp: ltr.createdAt ? new Date(ltr.createdAt).toISOString() : void 0,
      completed: isWritten,
      current: !isSealed
    },
    {
      step: "SEALED",
      label: "Sealed",
      timestamp: isSealed ? ltr.postedAt ? new Date(ltr.postedAt).toISOString() : new Date(ltr.createdAt).toISOString() : void 0,
      completed: isSealed,
      current: isSealed && !isInTransit
    },
    {
      step: "DISPATCHED",
      label: "Dispatched",
      timestamp: isDispatched ? ltr.postedAt ? new Date(ltr.postedAt).toISOString() : new Date(ltr.createdAt).toISOString() : void 0,
      completed: isDispatched,
      current: isDispatched && isInTransit && !isArriving
    },
    {
      step: "IN_TRANSIT",
      label: "In Transit",
      timestamp: isInTransit ? ltr.postedAt ? new Date(ltr.postedAt).toISOString() : void 0 : void 0,
      completed: isInTransit,
      current: isInTransit && !isArriving && !isDelivered
    },
    {
      step: "ARRIVING",
      label: "Arriving",
      timestamp: isArriving ? new Date(deliveryDateTime - 24 * 3600 * 1e3).toISOString() : void 0,
      completed: isArriving,
      current: isArriving && !isDelivered
    },
    {
      step: "DELIVERED",
      label: "Delivered",
      timestamp: isDelivered ? deliveredAtTime ? new Date(deliveredAtTime).toISOString() : new Date(deliveryDateTime).toISOString() : void 0,
      completed: isDelivered,
      current: isDelivered
    }
  ];
  return {
    id: ltr._id.toString(),
    trackingCode: ltr.trackingCode,
    type: ltr.letterType,
    templateId: ltr.templateId,
    senderName: ltr.senderName || reqUser?.fullName || "Correspondent",
    senderEmail: ltr.senderEmail || reqUser?.email || "correspondent@oldletters.in",
    recipientName: ltr.recipientName || recipient?.displayName || "Recipient",
    recipientEmail: rawRecipientEmail,
    recipientEmailMasked,
    letterDate: new Date(ltr.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }),
    greeting: ltr.salutation,
    content: ltr.body,
    signoff: ltr.signoff,
    attachments: ltr.attachments || [],
    verificationMethod: ltr.recipientVerificationMethod,
    postedAt: ltr.postedAt ? ltr.postedAt.toISOString() : ltr.createdAt.toISOString(),
    scheduledDeliveryAt: ltr.deliveryDate ? ltr.deliveryDate.toISOString() : void 0,
    deliveredAt: isDelivered ? ltr.deliveredAt ? ltr.deliveredAt.toISOString() : ltr.deliveryDate ? ltr.deliveryDate.toISOString() : void 0 : void 0,
    waitingHours: ltr.waitingHours || 48,
    status: isDelivered ? "DELIVERED" : ltr.status,
    postmarkCity: ltr.postmarkCity || "Central Postal Archive",
    deliveryToken,
    paymentStatus: payment ? payment.status === "APPROVED" ? "PAID" : payment.status : "COMPLIMENTARY",
    amountPaid: payment?.amount || 0,
    currency: payment?.currency || "INR",
    upiReference: payment?.upiReference,
    timeline,
    createdAt: ltr.createdAt ? ltr.createdAt.toISOString() : (/* @__PURE__ */ new Date()).toISOString()
  };
}
app.get(["/api/letters", "/api/archive", "/api/letters/sent"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const senderId = req.user.id;
    const senderEmail = (req.user.email || "").toLowerCase();
    const query = {
      $or: [
        { senderId },
        ...ObjectId.isValid(senderId) ? [{ senderId: new ObjectId(senderId) }] : [],
        { senderEmail }
      ]
    };
    const rawLetters = await (await lettersColl.find(query)).sort({ createdAt: -1 }).toArray();
    const mapped = await Promise.all(
      rawLetters.map((ltr) => mapLetterDocToResponse(ltr, db, req.user))
    );
    res.json({ success: true, letters: mapped });
  } catch (err) {
    console.error("Error fetching letters:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get(["/api/letters/received", "/api/letters-received"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const recipientsColl = db.collection("letterRecipients");
    const tokensColl = db.collection("deliveryTokens");
    const userEmail = (req.user.email || "").toLowerCase();
    const recipientDocs = await recipientsColl.find({ email: userEmail }).toArray();
    const recipientLetterIds = recipientDocs.map((r) => r.letterId);
    const query = {
      $or: [
        { recipientEmail: userEmail },
        ...recipientLetterIds.length > 0 ? [{ _id: { $in: recipientLetterIds.map((id) => typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : id) } }] : []
      ]
    };
    const rawLetters = await (await lettersColl.find(query)).sort({ createdAt: -1 }).toArray();
    const now = /* @__PURE__ */ new Date();
    const receivedLetters = await Promise.all(
      rawLetters.map(async (ltr) => {
        const isDelivered = ltr.status === "DELIVERED" || ltr.status === "OPENED" || ltr.deliveryDate && new Date(ltr.deliveryDate) <= now;
        let deliveryToken = void 0;
        try {
          const tokenDoc = await tokensColl.findOne({
            $or: [
              { letterId: ltr._id },
              { letterId: ltr._id.toString() },
              ...ObjectId.isValid(ltr._id) ? [{ letterId: new ObjectId(ltr._id) }] : []
            ]
          });
          if (tokenDoc?.rawToken) {
            deliveryToken = tokenDoc.rawToken;
          } else if (tokenDoc?.tokenHash) {
            deliveryToken = tokenDoc.tokenHash;
          } else {
            deliveryToken = ltr.trackingCode || ltr._id.toString();
          }
        } catch {
          deliveryToken = ltr.trackingCode || ltr._id.toString();
        }
        const scheduledAt = ltr.deliveryDate ? new Date(ltr.deliveryDate).toISOString() : void 0;
        const postedAt = ltr.postedAt ? new Date(ltr.postedAt).toISOString() : ltr.createdAt ? new Date(ltr.createdAt).toISOString() : void 0;
        return {
          id: ltr._id.toString(),
          trackingCode: ltr.trackingCode,
          senderName: ltr.senderName || "Anonymous Correspondent",
          letterType: ltr.letterType,
          templateId: ltr.templateId || "ivory",
          letterDate: new Date(ltr.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          }),
          postedAt,
          scheduledDeliveryAt: scheduledAt,
          deliveredAt: isDelivered ? ltr.deliveredAt ? new Date(ltr.deliveredAt).toISOString() : scheduledAt : void 0,
          status: isDelivered ? "DELIVERED" : "IN_TRANSIT",
          isSealed: !isDelivered,
          canOpen: isDelivered,
          deliveryToken,
          sealedMessage: !isDelivered ? "SEALED IN TRANSIT \xB7 Your letter is still making its way to you." : void 0,
          postmarkCity: ltr.postmarkCity || "Central Postal Archive",
          verificationMethod: ltr.recipientVerificationMethod || "open",
          createdAt: ltr.createdAt ? new Date(ltr.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
        };
      })
    );
    res.json({ success: true, letters: receivedLetters });
  } catch (err) {
    console.error("Error fetching received letters:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/letters/draft", "/api/letters/save-draft"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const senderId = req.user.id;
    const senderEmail = (req.user?.email || "").toLowerCase();
    const senderName = req.user?.fullName || "Correspondent";
    const {
      letterId: requestedId,
      type = "LOVE",
      templateId = "ivory",
      recipientName = "",
      recipientEmail = "",
      greeting = "Dear Friend,",
      content = "",
      signoff = "Yours,",
      verificationMethod = "open",
      scheduledDeliveryAt,
      waitingHours = 48,
      postmarkCity = "Central Postal Archive",
      attachments = []
    } = req.body;
    const now = /* @__PURE__ */ new Date();
    const deliveryDate = scheduledDeliveryAt ? new Date(scheduledDeliveryAt) : new Date(now.getTime() + (Number(waitingHours) || 48) * 3600 * 1e3);
    let letter = null;
    if (requestedId && ObjectId.isValid(requestedId)) {
      letter = await lettersColl.findOne({
        _id: new ObjectId(requestedId),
        $or: [{ senderId }, { senderId: new ObjectId(senderId) }]
      });
    }
    if (letter) {
      await lettersColl.updateOne(
        { _id: letter._id },
        {
          $set: {
            letterType: type,
            templateId,
            recipientName: recipientName.trim(),
            recipientEmail: recipientEmail.trim().toLowerCase(),
            salutation: greeting,
            body: content,
            signoff,
            recipientVerificationMethod: verificationMethod,
            scheduledDeliveryAt: deliveryDate,
            deliveryDate,
            waitingHours: Number(waitingHours) || 48,
            postmarkCity,
            attachments,
            updatedAt: now
          }
        }
      );
      const updated = await lettersColl.findOne({ _id: letter._id }) || letter;
      return res.json({
        success: true,
        letter: {
          id: (updated._id || letter._id).toString(),
          trackingCode: updated.trackingCode || letter.trackingCode,
          type: updated.letterType || letter.letterType,
          templateId: updated.templateId || letter.templateId,
          recipientName: updated.recipientName || letter.recipientName,
          recipientEmail: updated.recipientEmail || letter.recipientEmail,
          status: updated.status || letter.status,
          scheduledDeliveryAt: updated.scheduledDeliveryAt?.toISOString ? updated.scheduledDeliveryAt.toISOString() : updated.scheduledDeliveryAt,
          waitingHours: updated.waitingHours || letter.waitingHours
        }
      });
    }
    const newId = requestedId && ObjectId.isValid(requestedId) ? new ObjectId(requestedId) : new ObjectId();
    const trackingCode = `OL-${Math.floor(1e3 + Math.random() * 9e3)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const draftDoc = {
      _id: newId,
      senderId,
      senderEmail,
      senderName,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      letterType: type,
      templateId,
      salutation: greeting,
      body: content,
      signoff,
      status: "DRAFT",
      deliveryDate,
      scheduledDeliveryAt: deliveryDate,
      trackingCode,
      recipientVerificationMethod: verificationMethod,
      postmarkCity,
      waitingHours: Number(waitingHours) || 48,
      attachments,
      createdAt: now,
      updatedAt: now
    };
    await lettersColl.insertOne(draftDoc);
    return res.status(201).json({
      success: true,
      letter: {
        id: newId.toString(),
        trackingCode,
        type,
        templateId,
        recipientName: draftDoc.recipientName,
        recipientEmail: draftDoc.recipientEmail,
        status: "DRAFT",
        scheduledDeliveryAt: deliveryDate.toISOString(),
        waitingHours: draftDoc.waitingHours
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/letters", requireAuth, async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:create_letter:${clientIp}`, 60, 60 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many letters created from this network. Please wait." });
    }
    const senderId = req.user.id;
    const userAllowed = await checkDistributedRateLimit(req, res, `user:create_letter:${senderId}`, 40, 60 * 60 * 1e3);
    if (!userAllowed) {
      return res.status(429).json({ success: false, error: "Letter creation quota exceeded. Please wait an hour." });
    }
    const parseResult = CreateLetterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((e) => e.message).join(", ")
      });
    }
    const input = parseResult.data;
    const trackingCode = `OL-${Math.floor(1e3 + Math.random() * 9e3)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const rawDeliveryToken = crypto2.randomBytes(32).toString("hex");
    const tokenHash = hashSha2562(rawDeliveryToken);
    let passphraseHash = void 0;
    if (input.passphrase) {
      passphraseHash = await bcrypt2.hash(input.passphrase.trim().toLowerCase(), 10);
    }
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const recipientsColl = db.collection("letterRecipients");
    const tokensColl = db.collection("deliveryTokens");
    const eventsColl = db.collection("deliveryEvents");
    const paymentsColl = db.collection("payments");
    const mediaMetadataColl = db.collection("mediaMetadata");
    const letterId = new ObjectId();
    const now = /* @__PURE__ */ new Date();
    const createdAt = now;
    let deliveryDate;
    if (input.scheduledDeliveryAt) {
      const parsed = new Date(input.scheduledDeliveryAt);
      if (!isNaN(parsed.getTime())) {
        deliveryDate = parsed;
      } else {
        deliveryDate = new Date(createdAt.getTime() + (input.waitingHours || 48) * 3600 * 1e3);
      }
    } else {
      deliveryDate = new Date(createdAt.getTime() + (input.waitingHours || 48) * 3600 * 1e3);
    }
    const senderEmail = (req.user?.email || input.senderEmail).toLowerCase();
    const senderName = input.senderName || req.user?.fullName || "Correspondent";
    const recipientEmail = input.recipientEmail.trim().toLowerCase();
    const recipientName = input.recipientName.trim();
    if (!input.templateId || !input.templateId.trim()) {
      return res.status(400).json({ success: false, error: "Please choose your stationery before sealing the letter." });
    }
    if (!recipientName) {
      return res.status(400).json({ success: false, error: "Recipient name is required." });
    }
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid recipient email required." });
    }
    const linkedPaymentId = input.paymentId || req.body.personalMessage?.paymentId;
    const hasMedia = Boolean(input.hasMediaAttachment || req.body.personalMessage?.hasMediaAttachment || req.body.personalMessage?.mediaStorageKey);
    const mediaType = input.mediaType || req.body.personalMessage?.mediaType || (req.body.personalMessage?.type === "VIDEO" ? "VIDEO" : req.body.personalMessage?.type === "VOICE" ? "VOICE" : void 0);
    const mediaStorageKey = input.mediaStorageKey || req.body.personalMessage?.mediaStorageKey || void 0;
    const mediaStatus = input.mediaStatus || req.body.personalMessage?.mediaStatus || "PENDING";
    await lettersColl.insertOne({
      _id: letterId,
      senderId,
      senderEmail,
      senderName,
      recipientEmail,
      recipientName,
      letterType: input.type,
      templateId: input.templateId,
      salutation: input.greeting,
      body: input.content,
      signoff: input.signoff,
      status: input.status,
      deliveryDate,
      scheduledDeliveryAt: deliveryDate,
      trackingCode,
      recipientVerificationMethod: input.verificationMethod,
      secretPassphraseHash: passphraseHash,
      postmarkCity: input.postmarkCity || "Central Postal Archive",
      waitingHours: input.waitingHours,
      attachments: req.body.attachments || [],
      personalMessage: req.body.personalMessage || void 0,
      hasMediaAttachment: hasMedia,
      mediaType: mediaType || void 0,
      mediaStorageKey: mediaStorageKey || void 0,
      mediaPaymentId: linkedPaymentId || void 0,
      mediaStatus: hasMedia ? mediaStatus : void 0,
      postedAt: now,
      createdAt: now,
      updatedAt: now
    });
    if (linkedPaymentId) {
      try {
        const foundPayment = await paymentsColl.findOne({
          $or: [
            { paymentId: linkedPaymentId },
            ...ObjectId.isValid(linkedPaymentId) ? [{ _id: new ObjectId(linkedPaymentId) }] : [{ _id: linkedPaymentId }]
          ]
        });
        if (foundPayment) {
          await paymentsColl.updateOne(
            { _id: foundPayment._id },
            {
              $set: {
                letterId: letterId.toString(),
                trackingCode,
                recipientEmail,
                recipientName,
                updatedAt: now
              }
            }
          );
          await mediaMetadataColl.updateMany(
            {
              $or: [
                { paymentId: foundPayment._id.toString() },
                { paymentId: foundPayment.paymentId },
                ...mediaStorageKey ? [{ storageKey: mediaStorageKey }] : []
              ]
            },
            {
              $set: {
                letterId: letterId.toString(),
                updatedAt: now
              }
            }
          );
        }
      } catch (linkErr) {
        console.warn("[OLD-LETTERS] Failed to link payment to letter:", linkErr);
      }
    }
    await recipientsColl.insertOne({
      _id: new ObjectId(),
      letterId,
      email: recipientEmail,
      displayName: recipientName,
      verificationMethod: input.verificationMethod,
      createdAt: now
    });
    await tokensColl.insertOne({
      _id: new ObjectId(),
      letterId,
      tokenHash,
      rawToken: rawDeliveryToken,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1e3),
      createdAt: now
    });
    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId,
      eventType: "LETTER_POSTED",
      metadata: {
        scheduledDeliveryAt: input.scheduledDeliveryAt,
        trackingCode,
        recipient: recipientEmail
      },
      createdAt: now
    });
    const scheduledArrivalFormatted = deliveryDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });
    const recipientUrl = `${APP_URL}/letter/${rawDeliveryToken}`;
    const archiveUrl = `${APP_URL}/archive`;
    try {
      const senderMailRes = await sendLetterDispatchedSenderEmail({
        senderEmail,
        senderName,
        recipientName,
        trackingCode,
        letterType: input.type,
        scheduledArrivalFormatted,
        waitingHours: input.waitingHours,
        archiveUrl
      });
      logEmailDispatch({
        type: "SENDER_DISPATCH",
        to: senderEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || void 0,
        dispatchRef: trackingCode,
        status: senderMailRes.success ? "SENT" : "FAILED",
        error: senderMailRes.error,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId,
        eventType: "SENDER_DISPATCH_EMAIL_SENT",
        metadata: { senderEmail, status: senderMailRes.success ? "SENT" : "FAILED" },
        createdAt: /* @__PURE__ */ new Date()
      });
    } catch (err) {
      logEmailDispatch({
        type: "SENDER_DISPATCH",
        to: senderEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || void 0,
        dispatchRef: trackingCode,
        status: "FAILED",
        error: err.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    try {
      const recipientMailRes = await sendLetterDispatchedRecipientEmail({
        recipientEmail,
        recipientName,
        senderName,
        trackingCode,
        scheduledArrivalFormatted,
        waitingHours: input.waitingHours,
        recipientUrl
      });
      logEmailDispatch({
        type: "RECIPIENT_DISPATCH",
        to: recipientEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || void 0,
        dispatchRef: trackingCode,
        status: recipientMailRes.success ? "SENT" : "FAILED",
        error: recipientMailRes.error,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId,
        eventType: "RECIPIENT_DISPATCH_EMAIL_SENT",
        metadata: { recipientEmail, status: recipientMailRes.success ? "SENT" : "FAILED" },
        createdAt: /* @__PURE__ */ new Date()
      });
    } catch (err) {
      logEmailDispatch({
        type: "RECIPIENT_DISPATCH",
        to: recipientEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || void 0,
        dispatchRef: trackingCode,
        status: "FAILED",
        error: err.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const responseLetter = {
      id: letterId.toString(),
      trackingCode,
      type: input.type,
      templateId: input.templateId,
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      letterDate: now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      greeting: input.greeting,
      content: input.content,
      signoff: input.signoff,
      attachments: req.body.attachments || [],
      verificationMethod: input.verificationMethod,
      postedAt: now.toISOString(),
      scheduledDeliveryAt: deliveryDate.toISOString(),
      waitingHours: input.waitingHours,
      status: input.status,
      postmarkCity: input.postmarkCity || "Central Postal Archive"
    };
    res.status(201).json({
      success: true,
      letter: responseLetter,
      trackingCode,
      deliveryToken: rawDeliveryToken
    });
  } catch (err) {
    console.error("Error posting letter:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/letters/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection("letters");
    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }
    if (!letter) {
      return res.status(404).json({ success: false, error: "Letter not found." });
    }
    const isAdmin = await verifyAdminServerSide(req);
    const userId = req.user.id;
    const userEmail = (req.user.email || "").toLowerCase();
    const isSender = letter.senderId?.toString() === userId || ObjectId.isValid(userId) && letter.senderId?.toString() === new ObjectId(userId).toString() || letter.senderEmail?.toLowerCase() === userEmail;
    const isRecipient = letter.recipientEmail?.toLowerCase() === userEmail;
    if (!isSender && !isRecipient && !isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied to this correspondence." });
    }
    const nowMs = Date.now();
    const { ms: deliveryTimeMs } = resolveDeliveryDate(letter);
    const isDelivered = letter.status === "DELIVERED" || letter.status === "OPENED" || letter.status === "COMPLETED" || nowMs >= deliveryTimeMs;
    if (isRecipient && !isSender && !isAdmin && !isDelivered) {
      return res.json({
        success: true,
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          senderName: letter.senderName || "Anonymous Correspondent",
          letterType: letter.letterType,
          templateId: letter.templateId || "ivory",
          letterDate: new Date(letter.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          }),
          status: "IN_TRANSIT",
          isSealed: true,
          canOpen: false,
          sealedMessage: "SEALED IN TRANSIT \xB7 Your letter is still making its way to you.",
          scheduledDeliveryAt: letter.deliveryDate ? new Date(letter.deliveryDate).toISOString() : void 0,
          postmarkCity: letter.postmarkCity || "Central Postal Archive"
        }
      });
    }
    const mapped = await mapLetterDocToResponse(letter, db, req.user);
    res.json({ success: true, letter: mapped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/letters/:id/post", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const tokensColl = db.collection("deliveryTokens");
    const eventsColl = db.collection("deliveryEvents");
    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }
    if (!letter) {
      return res.status(404).json({ success: false, error: "Letter not found." });
    }
    if (letter.senderId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied: You can only post your own correspondence." });
    }
    const now = /* @__PURE__ */ new Date();
    await lettersColl.updateOne(
      { _id: letter._id },
      {
        $set: {
          status: "SCHEDULED",
          postedAt: now,
          updatedAt: now
        }
      }
    );
    const existingToken = await tokensColl.findOne({ letterId: letter._id });
    let rawDeliveryToken = existingToken?.rawToken || "";
    if (!existingToken) {
      rawDeliveryToken = crypto2.randomBytes(32).toString("hex");
      const tokenHash = hashSha2562(rawDeliveryToken);
      await tokensColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        tokenHash,
        rawToken: rawDeliveryToken,
        expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1e3),
        createdAt: now
      });
    }
    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId: letter._id,
      eventType: "LETTER_POSTED",
      metadata: { trackingCode: letter.trackingCode },
      createdAt: now
    });
    const updated = await lettersColl.findOne({ _id: letter._id });
    const mapped = await mapLetterDocToResponse(updated, db, req.user);
    const recipientsColl = db.collection("letterRecipients");
    const recipientDoc = await recipientsColl.findOne({ letterId: letter._id });
    const senderEmail = (letter.senderEmail || req.user.email).toLowerCase();
    const senderName = letter.senderName || req.user?.fullName || "Correspondent";
    const recipientEmail = (recipientDoc?.email || letter.recipientEmail || "").toLowerCase();
    const recipientName = recipientDoc?.displayName || letter.recipientName || "Recipient";
    const deliveryDate = new Date(letter.deliveryDate || letter.scheduledDeliveryAt || now);
    const scheduledArrivalFormatted = deliveryDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });
    const recipientUrl = `${APP_URL}/letter/${rawDeliveryToken || letter.trackingCode}`;
    const archiveUrl = `${APP_URL}/archive`;
    if (senderEmail) {
      try {
        const sRes = await sendLetterDispatchedSenderEmail({
          senderEmail,
          senderName,
          recipientName,
          trackingCode: letter.trackingCode,
          letterType: letter.letterType,
          scheduledArrivalFormatted,
          waitingHours: letter.waitingHours || 48,
          archiveUrl
        });
        logEmailDispatch({
          type: "SENDER_DISPATCH",
          to: senderEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: sRes.success ? "SENT" : "FAILED",
          error: sRes.error
        });
      } catch (err) {
        logEmailDispatch({
          type: "SENDER_DISPATCH",
          to: senderEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: "FAILED",
          error: err.message
        });
      }
    }
    if (recipientEmail) {
      try {
        const rRes = await sendLetterDispatchedRecipientEmail({
          recipientEmail,
          recipientName,
          senderName,
          trackingCode: letter.trackingCode,
          scheduledArrivalFormatted,
          waitingHours: letter.waitingHours || 48,
          recipientUrl
        });
        logEmailDispatch({
          type: "RECIPIENT_DISPATCH",
          to: recipientEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: rRes.success ? "SENT" : "FAILED",
          error: rRes.error
        });
      } catch (err) {
        logEmailDispatch({
          type: "RECIPIENT_DISPATCH",
          to: recipientEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: "FAILED",
          error: err.message
        });
      }
    }
    res.json({
      success: true,
      letter: mapped,
      trackingCode: letter.trackingCode,
      deliveryToken: rawDeliveryToken || void 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put("/api/letters/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const recipientsColl = db.collection("letterRecipients");
    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }
    if (!letter) {
      return res.status(404).json({ success: false, error: "Letter not found." });
    }
    if (letter.senderId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied: You can only edit your own correspondence." });
    }
    const {
      salutation,
      greeting,
      body,
      content,
      signoff,
      recipientName,
      recipientEmail,
      templateId,
      letterType,
      type,
      scheduledDeliveryAt,
      waitingHours,
      verificationMethod
    } = req.body;
    const updateFields = { updatedAt: /* @__PURE__ */ new Date() };
    if (greeting !== void 0 || salutation !== void 0) updateFields.salutation = greeting ?? salutation;
    if (content !== void 0 || body !== void 0) updateFields.body = content ?? body;
    if (signoff !== void 0) updateFields.signoff = signoff;
    if (templateId !== void 0) updateFields.templateId = templateId;
    if (type !== void 0 || letterType !== void 0) updateFields.letterType = type ?? letterType;
    if (waitingHours !== void 0) updateFields.waitingHours = waitingHours;
    if (scheduledDeliveryAt !== void 0) updateFields.deliveryDate = new Date(scheduledDeliveryAt);
    if (verificationMethod !== void 0) updateFields.recipientVerificationMethod = verificationMethod;
    await lettersColl.updateOne({ _id: letter._id }, { $set: updateFields });
    if (recipientName || recipientEmail) {
      const recipientUpdate = {};
      if (recipientName) recipientUpdate.displayName = recipientName;
      if (recipientEmail) recipientUpdate.email = recipientEmail.toLowerCase();
      await recipientsColl.updateOne({ letterId: letter._id }, { $set: recipientUpdate });
    }
    const updated = await lettersColl.findOne({ _id: letter._id });
    const mapped = await mapLetterDocToResponse(updated, db, req.user);
    res.json({ success: true, letter: mapped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/letters/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const recipientsColl = db.collection("letterRecipients");
    const tokensColl = db.collection("deliveryTokens");
    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }
    if (!letter) {
      return res.status(404).json({ success: false, error: "Letter not found." });
    }
    if (letter.senderId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied: You can only delete your own correspondence." });
    }
    await lettersColl.deleteOne({ _id: letter._id });
    await recipientsColl.deleteMany({ letterId: letter._id });
    await tokensColl.deleteMany({ letterId: letter._id });
    res.json({ success: true, message: "Correspondence removed." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
async function resolveLetterFromToken(rawToken, db) {
  if (!rawToken || typeof rawToken !== "string") return null;
  const cleanToken = rawToken.trim();
  const tokenHash = hashSha2562(cleanToken);
  const tokensColl = db.collection("deliveryTokens");
  const lettersColl = db.collection("letters");
  const recipientsColl = db.collection("letterRecipients");
  let tokenRec = null;
  let letter = null;
  const validTokenCondition = {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: /* @__PURE__ */ new Date() } }],
    $and: [{ revoked: { $ne: true } }]
  };
  tokenRec = await tokensColl.findOne({
    tokenHash,
    ...validTokenCondition
  });
  if (tokenRec) {
    letter = await lettersColl.findOne({
      _id: ObjectId.isValid(tokenRec.letterId) ? new ObjectId(tokenRec.letterId) : tokenRec.letterId
    });
  }
  if (!letter) {
    tokenRec = await tokensColl.findOne({
      $and: [
        { $or: [{ tokenHash: cleanToken }, { rawToken: cleanToken }] },
        validTokenCondition
      ]
    });
    if (tokenRec) {
      letter = await lettersColl.findOne({
        _id: ObjectId.isValid(tokenRec.letterId) ? new ObjectId(tokenRec.letterId) : tokenRec.letterId
      });
    }
  }
  if (!letter) {
    const letterByCode = await lettersColl.findOne({
      trackingCode: { $regex: new RegExp(`^${cleanToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
    });
    if (letterByCode) {
      tokenRec = await tokensColl.findOne({
        $and: [
          { $or: [{ letterId: letterByCode._id }, { letterId: letterByCode._id.toString() }] },
          { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: /* @__PURE__ */ new Date() } }] },
          { revoked: { $ne: true } }
        ]
      });
      if (tokenRec || !await tokensColl.findOne({ $or: [{ letterId: letterByCode._id }, { letterId: letterByCode._id.toString() }] })) {
        letter = letterByCode;
      }
    }
  }
  if (!letter && ObjectId.isValid(cleanToken)) {
    const letterById = await lettersColl.findOne({ _id: new ObjectId(cleanToken) });
    if (letterById) {
      tokenRec = await tokensColl.findOne({
        $and: [
          { $or: [{ letterId: letterById._id }, { letterId: letterById._id.toString() }] },
          { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: /* @__PURE__ */ new Date() } }] },
          { revoked: { $ne: true } }
        ]
      });
      if (tokenRec || !await tokensColl.findOne({ $or: [{ letterId: letterById._id }, { letterId: letterById._id.toString() }] })) {
        letter = letterById;
      }
    }
  }
  if (!letter) return null;
  const recipient = await recipientsColl.findOne({
    $or: [{ letterId: letter._id }, { letterId: letter._id.toString() }]
  });
  const resolvedTokenHash = tokenRec?.tokenHash || tokenHash;
  return { letter, tokenRec, recipient, tokenHash: resolvedTokenHash };
}
function isRecipientSessionVerified(req, letterId) {
  const rcptCookieName = `oldletters_rcpt_${letterId}`;
  const candidateToken = req.cookies?.[rcptCookieName] || req.headers["x-recipient-token"] || (req.headers.authorization?.startsWith("Bearer rcpt_") ? req.headers.authorization.slice(7) : null);
  if (candidateToken && typeof candidateToken === "string") {
    try {
      const cleanJwt = candidateToken.startsWith("rcpt_") ? candidateToken.slice(5) : candidateToken;
      const decoded = jwt.verify(cleanJwt, JWT_SECRET);
      if (decoded && decoded.letterId === letterId && decoded.verified === true) {
        return true;
      }
    } catch {
    }
  }
  return false;
}
app.get(["/api/delivery/token/:token", "/api/letter/:token"], async (req, res) => {
  try {
    const rawToken = req.params.token;
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const usersColl = db.collection("users");
    const paidFeaturesColl = db.collection("paidFeatures");
    const resolved = await resolveLetterFromToken(rawToken, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: "Correspondence not found or delivery link expired." });
    }
    const { letter, recipient } = resolved;
    if (letter.status === "CANCELLED") {
      return res.status(410).json({
        success: false,
        error: "This correspondence has been recalled or cancelled by the sender.",
        status: "CANCELLED"
      });
    }
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const { date: deliveryDate, ms: deliveryTimeMs } = resolveDeliveryDate(letter);
    const isDeliveredByStatus = letter.status === "DELIVERED" || letter.status === "OPENED" || letter.status === "COMPLETED";
    const isArrived = isDeliveredByStatus || nowMs >= deliveryTimeMs;
    const remainingMs = isArrived ? 0 : Math.max(0, deliveryTimeMs - nowMs);
    const remainingSeconds = isArrived ? 0 : Math.max(1, Math.ceil(remainingMs / 1e3));
    const remainingHours = isArrived ? 0 : Math.ceil(remainingMs / (1e3 * 60 * 60));
    if (isArrived && (letter.status === "SCHEDULED" || letter.status === "IN TRANSIT" || letter.status === "IN_TRANSIT" || letter.status === "DRAFT")) {
      await lettersColl.updateOne(
        { _id: letter._id },
        { $set: { status: "DELIVERED", deliveredAt: letter.deliveredAt || now, updatedAt: now } }
      );
      letter.status = "DELIVERED";
    }
    const rawEmail = recipient?.email || letter.recipientEmail || "";
    const maskedEmail = rawEmail.replace(/(?<=.).(?=.*@)/g, "*");
    let senderDisplayName = letter.senderName || "A correspondent";
    if ((!letter.senderName || letter.senderName === "Correspondent") && letter.senderId) {
      try {
        const senderDoc = await usersColl.findOne({ _id: new ObjectId(letter.senderId) });
        if (senderDoc?.fullName) {
          senderDisplayName = senderDoc.fullName;
        }
      } catch {
      }
    }
    const verificationMethod = letter.recipientVerificationMethod || "open";
    const isVerifiedSession = isArrived && isRecipientSessionVerified(req, letter._id.toString());
    const isAuthorizedToRead = isVerifiedSession || verificationMethod === "open";
    if (!isArrived) {
      return res.json({
        success: true,
        isSealed: true,
        isArrived: false,
        canUnseal: false,
        isVerified: false,
        metadata: {
          trackingCode: letter.trackingCode,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || letter.recipientName || "Recipient",
          recipientEmailMasked: maskedEmail,
          verificationMethod,
          status: "IN TRANSIT",
          isDelivered: false,
          isArrived: false,
          canUnseal: false,
          deliveryDate: deliveryDate.toISOString(),
          scheduledDeliveryAt: deliveryDate.toISOString(),
          deliveryDateMs: deliveryTimeMs,
          serverTime: now.toISOString(),
          serverTimeMs: nowMs,
          waitingHours: letter.waitingHours || 48,
          remainingMs,
          remainingSeconds,
          remainingHours,
          templateId: letter.templateId || "ivory",
          postmarkCity: letter.postmarkCity || "Central Postal Archive"
        }
      });
    }
    if (isAuthorizedToRead) {
      const recipientAccessToken = jwt.sign(
        {
          letterId: letter._id.toString(),
          trackingCode: letter.trackingCode,
          verified: true,
          scope: "recipient_read"
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      const secure = getCookieSecurity(req);
      res.cookie(`oldletters_rcpt_${letter._id.toString()}`, recipientAccessToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 30 * 24 * 3600 * 1e3,
        path: "/"
      });
      if (letter.status === "DELIVERED") {
        await lettersColl.updateOne(
          { _id: letter._id, status: "DELIVERED" },
          { $set: { status: "OPENED", openedAt: now, updatedAt: now } }
        );
        letter.status = "OPENED";
      }
      const paidList = await paidFeaturesColl.find({
        letterId: letter._id.toString(),
        status: "UNLOCKED"
      }).toArray();
      const paymentsColl = db.collection("payments");
      const mediaColl = db.collection("mediaMetadata");
      const approvedPayment = await paymentsColl.findOne({
        $or: [
          { letterId: letter._id.toString() },
          ...letter.trackingCode ? [{ letterId: letter.trackingCode }] : [],
          ...letter.mediaPaymentId ? [{ paymentId: letter.mediaPaymentId }] : [],
          ...letter.personalMessage?.paymentId ? [{ paymentId: letter.personalMessage.paymentId }] : []
        ],
        status: "APPROVED"
      });
      const approvedMedia = await mediaColl.findOne({
        $or: [
          { letterId: letter._id.toString() },
          ...letter.mediaStorageKey ? [{ storageKey: letter.mediaStorageKey }] : [],
          ...letter.personalMessage?.mediaStorageKey ? [{ storageKey: letter.personalMessage.mediaStorageKey }] : [],
          ...approvedPayment ? [{ paymentId: approvedPayment._id.toString() }, { paymentId: approvedPayment.paymentId }] : []
        ],
        mediaStatus: "APPROVED"
      });
      const personalMessage = approvedPayment && approvedMedia && approvedMedia.mediaStatus === "APPROVED" ? {
        mediaType: approvedMedia.mediaType,
        storageKey: approvedMedia.storageKey,
        mediaStatus: "APPROVED",
        streamUrl: `/api/delivery/media/${rawToken}`
      } : letter.personalMessage?.mediaStatus === "REJECTED" || approvedPayment?.status === "REJECTED" ? {
        mediaStatus: "REJECTED"
      } : null;
      return res.json({
        success: true,
        isSealed: false,
        isArrived: true,
        canUnseal: true,
        isVerified: true,
        recipientAccessToken,
        metadata: {
          trackingCode: letter.trackingCode,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || letter.recipientName || "Recipient",
          recipientEmailMasked: maskedEmail,
          verificationMethod,
          status: letter.status,
          isDelivered: true,
          isArrived: true,
          canUnseal: true,
          deliveryDate: deliveryDate.toISOString(),
          scheduledDeliveryAt: deliveryDate.toISOString(),
          deliveryDateMs: deliveryTimeMs,
          serverTime: now.toISOString(),
          serverTimeMs: nowMs,
          waitingHours: letter.waitingHours || 48,
          remainingMs: 0,
          remainingSeconds: 0,
          remainingHours: 0,
          templateId: letter.templateId || "ivory",
          postmarkCity: letter.postmarkCity || "Central Postal Archive"
        },
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          type: letter.letterType,
          templateId: letter.templateId,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || letter.recipientName || "Recipient",
          letterDate: new Date(letter.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          }),
          greeting: letter.salutation,
          content: letter.body,
          signoff: letter.signoff,
          attachments: letter.attachments || [],
          status: letter.status,
          personalMessage,
          paidFeatures: paidList.map((pf) => pf.featureCode)
        }
      });
    }
    return res.json({
      success: true,
      isSealed: true,
      isArrived: true,
      canUnseal: true,
      isVerified: false,
      metadata: {
        trackingCode: letter.trackingCode,
        senderName: senderDisplayName,
        recipientName: recipient?.displayName || letter.recipientName || "Recipient",
        recipientEmailMasked: maskedEmail,
        verificationMethod,
        status: letter.status,
        isDelivered: true,
        isArrived: true,
        canUnseal: true,
        deliveryDate: deliveryDate.toISOString(),
        scheduledDeliveryAt: deliveryDate.toISOString(),
        deliveryDateMs: deliveryTimeMs,
        serverTime: now.toISOString(),
        serverTimeMs: nowMs,
        waitingHours: letter.waitingHours || 48,
        remainingMs: 0,
        remainingSeconds: 0,
        remainingHours: 0,
        templateId: letter.templateId || "ivory",
        postmarkCity: letter.postmarkCity || "Central Postal Archive"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/delivery/request-otp", "/api/recipient/request-otp"], async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: "Delivery token required." });
    }
    const db = await getDb();
    const otpColl = db.collection("otpCodes");
    const eventsColl = db.collection("deliveryEvents");
    const resolved = await resolveLetterFromToken(token, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: "Correspondence not found." });
    }
    const { letter, recipient } = resolved;
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const { date: deliveryDate, ms: deliveryTimeMs } = resolveDeliveryDate(letter);
    const isDeliveredByStatus = letter.status === "DELIVERED" || letter.status === "OPENED" || letter.status === "COMPLETED";
    const isArrived = isDeliveredByStatus || nowMs >= deliveryTimeMs;
    const remainingMs = isArrived ? 0 : Math.max(0, deliveryTimeMs - nowMs);
    const remainingHours = Math.ceil(remainingMs / (1e3 * 60 * 60));
    if (!isArrived) {
      return res.status(403).json({
        success: false,
        error: `This correspondence is still sealed in transit. Scheduled arrival is ${deliveryDate.toUTCString()} (${remainingHours} hours remaining). Verification codes cannot be dispatched before the scheduled arrival time.`
      });
    }
    if (!recipient || !recipient.email) {
      return res.status(400).json({ success: false, error: "Recipient address not registered." });
    }
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:recipient_otp:${clientIp}`, 20, 15 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many verification requests from this network. Please wait a few minutes." });
    }
    const letterAllowed = await checkDistributedRateLimit(req, res, `recipient_otp:${letter._id.toString()}`, 5, 15 * 60 * 1e3);
    if (!letterAllowed) {
      return res.status(429).json({ success: false, error: "Too many OTP requests. Please wait 15 minutes." });
    }
    await otpColl.updateOne({ letterId: letter._id, used: false }, { $set: { used: true } });
    const otpCode = crypto2.randomInt(1e5, 999999).toString();
    const otpHash = hashSha2562(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    await otpColl.insertOne({
      _id: new ObjectId(),
      email: recipient.email,
      letterId: letter._id,
      otpHash,
      attempts: 0,
      expiresAt,
      used: false,
      createdAt: /* @__PURE__ */ new Date()
    });
    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId: letter._id,
      eventType: "OTP_SENT",
      metadata: { recipientEmail: recipient.email },
      createdAt: /* @__PURE__ */ new Date()
    });
    if (isEmailConfigured()) {
      await sendMail({
        to: recipient.email,
        subject: "Your letter has arrived \u2014 OLD-LETTERS Verification Code",
        html: `
          <div style="background-color: #faf9f7; padding: 40px; font-family: serif; color: #134e4a; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 36px; border-radius: 4px;">
              <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #78716c; margin-bottom: 12px; font-family: monospace;">
                PRIVATE CORRESPONDENCE VERIFICATION
              </div>
              <h2 style="font-size: 26px; font-weight: 300; margin: 0 0 16px 0;">Verify Your Access</h2>
              <p style="font-size: 14px; font-family: sans-serif; color: #57534e; margin-bottom: 24px;">
                Enter this code to unseal your incoming letter. Valid for 10 minutes.
              </p>
              <div style="font-size: 36px; font-family: monospace; letter-spacing: 0.25em; font-weight: bold; background: #faf9f7; padding: 16px; border: 1px dashed #134e4a; color: #134e4a; margin: 24px 0;">
                ${otpCode}
              </div>
            </div>
          </div>
        `
      });
    }
    const isProdEnv = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    res.json({
      success: true,
      message: "Verification code dispatched to recipient email.",
      devOtpHint: !isEmailConfigured() && !isProdEnv ? otpCode : void 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/delivery/verify", "/api/delivery/verify/:token", "/api/delivery/verify-otp", "/api/recipient/verify", "/api/recipient/verify/:token", "/api/recipient/verify-otp", "/api/recipient/passphrase", "/api/letters/verify/:token", "/api/letters/:token/verify"], async (req, res) => {
  try {
    const rawToken = req.params.token || req.body.token;
    const bodyWithToken = { ...req.body, token: rawToken };
    const parseResult = RecipientVerifySchema.safeParse(bodyWithToken);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((e) => e.message).join(", ")
      });
    }
    const { token, otp, passphrase } = parseResult.data;
    const verificationMethod = parseResult.data.verificationMethod || (otp ? "otp" : passphrase ? "passphrase" : "open");
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const recipientsColl = db.collection("letterRecipients");
    const otpColl = db.collection("otpCodes");
    const eventsColl = db.collection("deliveryEvents");
    const paidFeaturesColl = db.collection("paidFeatures");
    const usersColl = db.collection("users");
    const resolved = await resolveLetterFromToken(token, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: "Correspondence not found or link expired." });
    }
    const { letter, recipient, tokenHash } = resolved;
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:delivery_verify:${clientIp}`, 30, 15 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many verification attempts from this network. Please wait 15 minutes." });
    }
    const letterAllowed = await checkDistributedRateLimit(req, res, `verify_attempt:${letter._id.toString()}`, 10, 15 * 60 * 1e3);
    if (!letterAllowed) {
      return res.status(429).json({ success: false, error: "Too many verification attempts for this correspondence. Please wait 15 minutes." });
    }
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const { date: deliveryDate, ms: deliveryTimeMs } = resolveDeliveryDate(letter);
    const isDeliveredByStatus = letter.status === "DELIVERED" || letter.status === "OPENED" || letter.status === "COMPLETED";
    const isArrived = isDeliveredByStatus || nowMs >= deliveryTimeMs;
    const remainingMs = isArrived ? 0 : Math.max(0, deliveryTimeMs - nowMs);
    const remainingHours = Math.ceil(remainingMs / (1e3 * 60 * 60));
    if (!isArrived) {
      return res.status(403).json({
        success: false,
        error: `This correspondence is still sealed in transit. Scheduled arrival is ${deliveryDate.toUTCString()} (${remainingHours} hours remaining). The wax seal cannot be broken before the appointed hour.`
      });
    }
    let isVerified = false;
    if (verificationMethod === "open") {
      isVerified = true;
    } else if (verificationMethod === "otp") {
      const activeOtp = await otpColl.findOne({
        letterId: letter._id,
        used: false,
        expiresAt: { $gte: /* @__PURE__ */ new Date() }
      });
      if (!activeOtp) {
        return res.status(400).json({ success: false, error: "Verification code expired or invalid. Please request a new code." });
      }
      if (activeOtp.attempts >= 5) {
        await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });
        return res.status(429).json({ success: false, error: "Maximum attempts exceeded. Verification locked." });
      }
      const inputHash = hashSha2562(String(otp || "").trim());
      if (inputHash === activeOtp.otpHash) {
        await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });
        isVerified = true;
      } else {
        await otpColl.updateOne({ _id: activeOtp._id }, { $inc: { attempts: 1 } });
        return res.status(401).json({ success: false, error: "Incorrect verification code." });
      }
    } else if (verificationMethod === "passphrase") {
      const inputPassphrase = String(passphrase || "").trim().toLowerCase();
      if (!letter.secretPassphraseHash) {
        return res.status(400).json({ success: false, error: "No passphrase set on this letter." });
      }
      let match = false;
      if (letter.secretPassphraseHash.startsWith("$2a$") || letter.secretPassphraseHash.startsWith("$2b$")) {
        match = await bcrypt2.compare(inputPassphrase, letter.secretPassphraseHash);
      } else {
        match = hashSha2562(inputPassphrase) === letter.secretPassphraseHash;
      }
      if (match) {
        isVerified = true;
      } else {
        return res.status(401).json({ success: false, error: "Incorrect cipher passphrase." });
      }
    }
    if (isVerified) {
      await lettersColl.updateOne(
        { _id: letter._id },
        {
          $set: {
            status: "OPENED",
            openedAt: now,
            updatedAt: now
          }
        }
      );
      if (recipient) {
        await recipientsColl.updateOne({ _id: recipient._id }, { $set: { verifiedAt: now } });
      }
      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        eventType: "RECIPIENT_VERIFIED",
        metadata: { method: verificationMethod },
        createdAt: now
      });
      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        eventType: "LETTER_OPENED",
        createdAt: now
      });
      const paidList = await (await paidFeaturesColl.find({
        letterId: letter._id.toString(),
        status: "UNLOCKED"
      })).toArray();
      let senderDisplayName = letter.senderName || "A correspondent";
      if ((!letter.senderName || letter.senderName === "Correspondent") && letter.senderId) {
        try {
          const senderDoc = await usersColl.findOne({ _id: new ObjectId(letter.senderId) });
          if (senderDoc?.fullName) {
            senderDisplayName = senderDoc.fullName;
          }
        } catch {
        }
      }
      const recipientAccessToken = "rcpt_" + jwt.sign(
        { letterId: letter._id.toString(), tokenHash, verified: true, role: "RECIPIENT" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      const secure = getCookieSecurity(req);
      res.cookie(`oldletters_rcpt_${letter._id.toString()}`, recipientAccessToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 7 * 24 * 3600 * 1e3,
        path: "/"
      });
      const paymentsColl = db.collection("payments");
      const mediaColl = db.collection("mediaMetadata");
      const approvedPayment = await paymentsColl.findOne({
        $or: [
          { letterId: letter._id.toString() },
          ...letter.trackingCode ? [{ letterId: letter.trackingCode }] : [],
          ...letter.mediaPaymentId ? [{ paymentId: letter.mediaPaymentId }, { _id: ObjectId.isValid(letter.mediaPaymentId) ? new ObjectId(letter.mediaPaymentId) : letter.mediaPaymentId }] : [],
          ...letter.personalMessage?.paymentId ? [{ paymentId: letter.personalMessage.paymentId }] : []
        ],
        status: "APPROVED"
      });
      const approvedMedia = await mediaColl.findOne({
        $or: [
          { letterId: letter._id.toString() },
          ...letter.mediaStorageKey ? [{ storageKey: letter.mediaStorageKey }] : [],
          ...letter.personalMessage?.mediaStorageKey ? [{ storageKey: letter.personalMessage.mediaStorageKey }] : [],
          ...approvedPayment ? [{ paymentId: approvedPayment._id.toString() }, { paymentId: approvedPayment.paymentId }] : []
        ],
        mediaStatus: "APPROVED"
      });
      const personalMessage = approvedPayment && approvedMedia && approvedMedia.mediaStatus === "APPROVED" ? {
        mediaType: approvedMedia.mediaType,
        storageKey: approvedMedia.storageKey,
        mediaStatus: "APPROVED",
        streamUrl: `/api/delivery/media/${token}`
      } : letter.personalMessage?.mediaStatus === "REJECTED" || approvedPayment?.status === "REJECTED" ? {
        mediaStatus: "REJECTED"
      } : null;
      return res.json({
        success: true,
        recipientAccessToken,
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          type: letter.letterType,
          templateId: letter.templateId,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || letter.recipientName || "Recipient",
          letterDate: new Date(letter.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          }),
          greeting: letter.salutation,
          content: letter.body,
          signoff: letter.signoff,
          attachments: letter.attachments || [],
          status: "OPENED",
          personalMessage,
          paidFeatures: paidList.map((pf) => pf.featureCode)
        }
      });
    }
    res.status(403).json({ success: false, error: "Verification failed." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
async function runDeliveryScheduler(db) {
  const now = /* @__PURE__ */ new Date();
  const lettersColl = db.collection("letters");
  const recipientsColl = db.collection("letterRecipients");
  const tokensColl = db.collection("deliveryTokens");
  const eventsColl = db.collection("deliveryEvents");
  const otpColl = db.collection("otpCodes");
  const processed = {
    halfwayCount: 0,
    preArrivalCount: 0,
    deliveredCount: 0,
    deliveredLetters: []
  };
  const activeScheduledLetters = await lettersColl.find({ status: "SCHEDULED" }).toArray();
  for (const letter of activeScheduledLetters) {
    const { date: deliveryDate, ms: deliveryTimeMs } = resolveDeliveryDate(letter);
    const postedAt = new Date(letter.postedAt || letter.createdAt);
    const elapsedMs = now.getTime() - postedAt.getTime();
    const msUntilArrival = deliveryTimeMs - now.getTime();
    if (elapsedMs >= 24 * 3600 * 1e3 && now.getTime() < deliveryTimeMs) {
      const alreadySentHalfway = await eventsColl.findOne({
        letterId: letter._id,
        eventType: "HALFWAY_EMAIL_SENT"
      });
      if (!alreadySentHalfway) {
        try {
          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: letter._id,
            eventType: "HALFWAY_EMAIL_SENT",
            createdAt: now
          });
        } catch {
          continue;
        }
        const recipient = await recipientsColl.findOne({ letterId: letter._id });
        const senderEmail = (letter.senderEmail || "").toLowerCase();
        const senderName = letter.senderName || "Correspondent";
        const recipientEmail = (recipient?.email || letter.recipientEmail || "").toLowerCase();
        const recipientName = recipient?.displayName || letter.recipientName || "Recipient";
        const tokenDoc = await tokensColl.findOne({ letterId: letter._id });
        const tokenStr = tokenDoc?.rawToken || letter.trackingCode;
        const recipientUrl = `${APP_URL}/letter/${tokenStr}`;
        const archiveUrl = `${APP_URL}/archive`;
        const scheduledArrivalFormatted = deliveryDate.toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short"
        });
        if (senderEmail) {
          try {
            const senderRes = await sendHalfwaySenderEmail({
              senderEmail,
              senderName,
              recipientName,
              trackingCode: letter.trackingCode,
              scheduledArrivalFormatted,
              archiveUrl
            });
            logEmailDispatch({
              type: "SENDER_WAITING_UPDATE",
              to: senderEmail,
              letterId: letter._id.toString(),
              dispatchRef: letter.trackingCode,
              status: senderRes.success ? "SENT" : "FAILED",
              error: senderRes.error
            });
          } catch (err) {
            logEmailDispatch({
              type: "SENDER_WAITING_UPDATE",
              to: senderEmail,
              letterId: letter._id.toString(),
              dispatchRef: letter.trackingCode,
              status: "FAILED",
              error: err.message
            });
          }
        }
        if (recipientEmail) {
          try {
            const rcptRes = await sendHalfwayRecipientEmail({
              recipientEmail,
              recipientName,
              trackingCode: letter.trackingCode,
              scheduledArrivalFormatted,
              recipientUrl
            });
            logEmailDispatch({
              type: "RECIPIENT_WAITING_UPDATE",
              to: recipientEmail,
              letterId: letter._id.toString(),
              dispatchRef: letter.trackingCode,
              status: rcptRes.success ? "SENT" : "FAILED",
              error: rcptRes.error
            });
          } catch {
          }
        }
        processed.halfwayCount++;
      }
    }
    if (msUntilArrival <= 30 * 60 * 1e3 && now.getTime() < deliveryTimeMs) {
      const alreadySentPreArrival = await eventsColl.findOne({
        letterId: letter._id,
        eventType: "PRE_ARRIVAL_NOTICE_SENT"
      });
      if (!alreadySentPreArrival) {
        try {
          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: letter._id,
            eventType: "PRE_ARRIVAL_NOTICE_SENT",
            createdAt: now
          });
        } catch {
          continue;
        }
        const recipient = await recipientsColl.findOne({ letterId: letter._id });
        const recipientEmail = (recipient?.email || letter.recipientEmail || "").toLowerCase();
        const recipientName = recipient?.displayName || letter.recipientName || "Recipient";
        const tokenDoc = await tokensColl.findOne({ letterId: letter._id });
        const tokenStr = tokenDoc?.rawToken || letter.trackingCode;
        const recipientUrl = `${APP_URL}/letter/${tokenStr}`;
        const scheduledArrivalFormatted = deliveryDate.toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short"
        });
        if (recipientEmail) {
          if (letter.recipientVerificationMethod === "otp") {
            const otpCode = crypto2.randomInt(1e5, 999999).toString();
            const otpHash = hashSha2562(otpCode);
            const expiresAt = new Date(deliveryDate.getTime() + 60 * 60 * 1e3);
            await otpColl.updateMany({ letterId: letter._id, used: false }, { $set: { used: true } });
            await otpColl.insertOne({
              _id: new ObjectId(),
              email: recipientEmail,
              letterId: letter._id,
              otpHash,
              attempts: 0,
              expiresAt,
              used: false,
              createdAt: now
            });
            try {
              const otpRes = await sendPreArrivalOtpRecipientEmail({
                recipientEmail,
                recipientName,
                trackingCode: letter.trackingCode,
                otpCode,
                scheduledArrivalFormatted,
                recipientUrl
              });
              logEmailDispatch({
                type: "RECIPIENT_PRE_ARRIVAL_OTP",
                to: recipientEmail,
                letterId: letter._id.toString(),
                dispatchRef: letter.trackingCode,
                status: otpRes.success ? "SENT" : "FAILED",
                error: otpRes.error
              });
            } catch (err) {
              logEmailDispatch({
                type: "RECIPIENT_PRE_ARRIVAL_OTP",
                to: recipientEmail,
                letterId: letter._id.toString(),
                dispatchRef: letter.trackingCode,
                status: "FAILED",
                error: err.message
              });
            }
          }
          processed.preArrivalCount++;
        }
      }
    }
  }
  const candidateScheduledLetters = await lettersColl.find({
    status: { $in: ["SCHEDULED", "IN TRANSIT", "IN_TRANSIT"] }
  }).toArray();
  const dueLetters = candidateScheduledLetters.filter((letter) => {
    const { ms: deliveryTimeMs } = resolveDeliveryDate(letter);
    return now.getTime() >= deliveryTimeMs;
  });
  for (const letter of dueLetters) {
    const updated = await lettersColl.findOneAndUpdate(
      { _id: letter._id, status: { $in: ["SCHEDULED", "IN TRANSIT", "IN_TRANSIT"] } },
      {
        $set: {
          status: "DELIVERED",
          deliveredAt: now,
          updatedAt: now
        }
      }
    );
    if (!updated) continue;
    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId: letter._id,
      eventType: "LETTER_DELIVERED",
      createdAt: now
    });
    const recipient = await recipientsColl.findOne({ letterId: letter._id });
    const recipientEmail = (recipient?.email || letter.recipientEmail || "").toLowerCase();
    const recipientName = recipient?.displayName || letter.recipientName || "Recipient";
    const tokenDoc = await tokensColl.findOne({ letterId: letter._id });
    let tokenStr = tokenDoc?.rawToken;
    if (!tokenStr) {
      tokenStr = crypto2.randomBytes(32).toString("hex");
      const tokenHash = hashSha2562(tokenStr);
      await tokensColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        tokenHash,
        rawToken: tokenStr,
        expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1e3),
        createdAt: now
      });
    }
    const deliveryUrl = `${APP_URL}/letter/${tokenStr}`;
    const arrivalFormatted = now.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });
    if (recipientEmail) {
      if (letter.recipientVerificationMethod === "otp") {
        const existingOtp = await otpColl.findOne({
          letterId: letter._id,
          used: false,
          expiresAt: { $gte: now }
        });
        if (!existingOtp) {
          const otpCode = crypto2.randomInt(1e5, 999999).toString();
          const otpHash = hashSha2562(otpCode);
          await otpColl.insertOne({
            _id: new ObjectId(),
            email: recipientEmail,
            letterId: letter._id,
            otpHash,
            attempts: 0,
            expiresAt: new Date(now.getTime() + 60 * 60 * 1e3),
            used: false,
            createdAt: now
          });
        }
      }
      const hasApprovedMedia = Boolean(
        letter.hasMediaAttachment && (letter.mediaStatus === "APPROVED" || letter.personalMessage?.mediaStatus === "APPROVED")
      );
      const enclosureMediaType = letter.mediaType || letter.personalMessage?.type || letter.personalMessage?.mediaType;
      try {
        const arrivalRes = await sendArrivalRecipientEmail({
          recipientEmail,
          recipientName,
          trackingCode: letter.trackingCode,
          arrivalFormatted,
          recipientUrl: deliveryUrl,
          requiresOtp: letter.recipientVerificationMethod === "otp",
          hasApprovedMedia,
          mediaType: enclosureMediaType === "VIDEO" ? "VIDEO" : enclosureMediaType === "VOICE" ? "VOICE" : void 0
        });
        logEmailDispatch({
          type: "LETTER_ARRIVED",
          to: recipientEmail,
          letterId: letter._id.toString(),
          paymentId: letter.mediaPaymentId || void 0,
          dispatchRef: letter.trackingCode,
          status: arrivalRes.success ? "SENT" : "FAILED",
          error: arrivalRes.error,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: letter._id,
          eventType: "RECIPIENT_ARRIVAL_EMAIL_SENT",
          metadata: { recipientEmail, hasApprovedMedia },
          createdAt: now
        });
      } catch (err) {
        logEmailDispatch({
          type: "LETTER_ARRIVED",
          to: recipientEmail,
          letterId: letter._id.toString(),
          paymentId: letter.mediaPaymentId || void 0,
          dispatchRef: letter.trackingCode,
          status: "FAILED",
          error: err.message,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    processed.deliveredCount++;
    processed.deliveredLetters.push({
      id: letter._id.toString(),
      trackingCode: letter.trackingCode,
      recipient: recipientEmail
    });
  }
  const mediaRetentionMs = Number(process.env.MEDIA_RETENTION_MS) || 7 * 24 * 3600 * 1e3;
  const mediaRetentionCutoff = new Date(now.getTime() - mediaRetentionMs);
  const mediaMetadataColl = db.collection("mediaMetadata");
  const paymentsColl = db.collection("payments");
  try {
    const deliveredPastRetention = await lettersColl.find({
      status: { $in: ["DELIVERED", "OPENED", "COMPLETED"] },
      $or: [
        { deliveredAt: { $lte: mediaRetentionCutoff } },
        { deliveryDate: { $lte: mediaRetentionCutoff } }
      ]
    }).toArray();
    let mediaCleanedCount = 0;
    for (const dLetter of deliveredPastRetention) {
      const activeMedia = await mediaMetadataColl.find({
        letterId: dLetter._id.toString(),
        mediaStatus: { $ne: "DELETED" }
      }).toArray();
      for (const m of activeMedia) {
        if (m.gridFsFileId) {
          try {
            await deleteGridFSFile("letterMedia", m.gridFsFileId);
          } catch {
          }
        }
        await mediaMetadataColl.updateOne(
          { _id: m._id },
          {
            $set: {
              mediaStatus: "DELETED",
              storageKey: "",
              deletedAt: now,
              updatedAt: now
            }
          }
        );
        if (m.paymentId) {
          await paymentsColl.updateOne(
            {
              $or: [
                { _id: ObjectId.isValid(m.paymentId) ? new ObjectId(m.paymentId) : m.paymentId },
                { paymentId: m.paymentId }
              ]
            },
            {
              $set: {
                mediaStatus: "DELETED",
                mediaStorageKey: null,
                updatedAt: now
              }
            }
          );
        }
        mediaCleanedCount++;
      }
    }
    processed.mediaCleanedCount = mediaCleanedCount;
  } catch (mediaCleanupErr) {
    console.warn("[OLD-LETTERS Scheduler] Media retention cleanup notice:", mediaCleanupErr);
  }
  return processed;
}
app.all(["/api/scheduler/tick", "/api/cron/delivery", "/api/internal/delivery/run"], async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const incomingAuth = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
    const cronHeader = req.headers["x-cron-secret"]?.trim();
    const querySecret = req.query.secret?.trim();
    const expectedSecret = process.env.CRON_SECRET || CRON_SECRET;
    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    if (process.env.CRON_SECRET || isProduction) {
      const authorized = expectedSecret && incomingAuth === expectedSecret || expectedSecret && cronHeader === expectedSecret || expectedSecret && querySecret === expectedSecret;
      if (!authorized) {
        const isAdmin = await verifyAdminServerSide(req);
        if (!isAdmin) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized cron dispatch. Valid Authorization: Bearer <CRON_SECRET> or admin session required."
          });
        }
      }
    }
    const db = await getDb();
    const result = await runDeliveryScheduler(db);
    res.json({
      success: true,
      endpoint: "/api/scheduler/tick",
      canonical: true,
      method: req.method,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      halfwayCount: result.halfwayCount,
      preArrivalCount: result.preArrivalCount,
      deliveredCount: result.deliveredCount,
      processed: result.deliveredLetters
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/testing/advance-delivery", "/api/delivery/advance"], async (req, res) => {
  try {
    const { token, trackingCode, stage } = req.body;
    const lookup = token || trackingCode;
    if (!lookup) {
      return res.status(400).json({ success: false, error: "Token or tracking code required." });
    }
    const db = await getDb();
    const resolved = await resolveLetterFromToken(lookup, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: "Correspondence not found." });
    }
    const { letter } = resolved;
    const lettersColl = db.collection("letters");
    let newDeliveryDate = new Date(Date.now() - 60 * 1e3);
    let newPostedAt = letter.postedAt || letter.createdAt;
    if (stage === "halfway" || stage === "24h") {
      newPostedAt = new Date(Date.now() - 25 * 3600 * 1e3);
      newDeliveryDate = new Date(Date.now() + 23 * 3600 * 1e3);
      await lettersColl.updateOne(
        { _id: letter._id },
        { $set: { postedAt: newPostedAt, deliveryDate: newDeliveryDate, scheduledDeliveryAt: newDeliveryDate, status: "SCHEDULED", updatedAt: /* @__PURE__ */ new Date() } }
      );
    } else if (stage === "pre-arrival" || stage === "30m" || stage === "47.5h") {
      newDeliveryDate = new Date(Date.now() + 20 * 60 * 1e3);
      await lettersColl.updateOne(
        { _id: letter._id },
        { $set: { deliveryDate: newDeliveryDate, scheduledDeliveryAt: newDeliveryDate, status: "SCHEDULED", updatedAt: /* @__PURE__ */ new Date() } }
      );
    } else {
      await lettersColl.updateOne(
        { _id: letter._id },
        { $set: { deliveryDate: newDeliveryDate, scheduledDeliveryAt: newDeliveryDate, status: "SCHEDULED", updatedAt: /* @__PURE__ */ new Date() } }
      );
    }
    const schedulerResult = await runDeliveryScheduler(db);
    res.json({
      success: true,
      message: `Delivery date advanced for stage '${stage || "arrived"}'. Scheduler processed successfully.`,
      deliveryDate: newDeliveryDate.toISOString(),
      trackingCode: letter.trackingCode,
      schedulerResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/payments", "/api/payments/create", "/payments", "/payments/create"], requireAuth, async (req, res) => {
  try {
    const parseResult = SubmitPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((e) => e.message).join(", ")
      });
    }
    const input = parseResult.data;
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:payment_submit:${clientIp}`, 30, 60 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many payment submissions from this network. Please wait." });
    }
    const userAllowed = await checkDistributedRateLimit(req, res, `user:payment_submit:${req.user.id}`, 20, 60 * 60 * 1e3);
    if (!userAllowed) {
      return res.status(429).json({ success: false, error: "Payment submission quota exceeded. Please wait an hour." });
    }
    if (input.screenshotUrl) {
      const urlCheck = validateScreenshotUrl(input.screenshotUrl);
      if (!urlCheck.valid) {
        return res.status(400).json({ success: false, error: urlCheck.error || "Invalid payment screenshot URL." });
      }
    }
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const lettersColl = db.collection("letters");
    const eventsColl = db.collection("deliveryEvents");
    const userId = req.user.id;
    const userEmail = (req.user.email || "").toLowerCase();
    let letter = null;
    if (input.letterId) {
      const letterConds = [{ trackingCode: input.letterId }];
      if (ObjectId.isValid(input.letterId)) {
        letterConds.unshift({ _id: new ObjectId(input.letterId) });
      } else {
        letterConds.unshift({ _id: input.letterId });
      }
      letter = await lettersColl.findOne({ $or: letterConds });
      if (letter) {
        const isOwner = letter.senderId?.toString() === userId.toString() || ObjectId.isValid(userId) && letter.senderId?.toString() === new ObjectId(userId).toString();
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            error: "Letter ownership verification failed. You may only submit payments for your own correspondence."
          });
        }
      }
    }
    const normalizedMediaType = input.mediaType === "VIDEO" || input.featureCode === "VIDEO_NOTE" || input.featureCode === "VIDEO" || input.amount === 149 ? "VIDEO" : "VOICE";
    const cleanUpi = input.upiReference.trim();
    if (cleanUpi.length < 6) {
      return res.status(400).json({
        success: false,
        error: "A valid UPI reference / UTR number (at least 6 alphanumeric characters) is required."
      });
    }
    const existingPayment = await paymentsColl.findOne({
      upiReference: cleanUpi,
      $or: [
        { userId: userId.toString() },
        ...ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []
      ]
    });
    const recipientEmail = (input.recipientEmail || letter?.recipientEmail || "").toLowerCase();
    const recipientName = input.recipientName || letter?.recipientName || "Recipient";
    const senderName = input.senderName || req.user?.fullName || letter?.senderName || "Correspondent";
    const featureType = normalizedMediaType === "VIDEO" ? "VIDEO_MESSAGE" : "VOICE_MESSAGE";
    if (existingPayment) {
      return res.status(200).json({
        success: true,
        paymentId: existingPayment.paymentId || `PAY-${existingPayment._id.toString().slice(-8).toUpperCase()}`,
        id: existingPayment._id.toString(),
        payment: {
          id: existingPayment._id.toString(),
          paymentId: existingPayment.paymentId || `PAY-${existingPayment._id.toString().slice(-8).toUpperCase()}`,
          letterId: existingPayment.letterId || null,
          userId: existingPayment.userId?.toString(),
          userEmail: existingPayment.userEmail || userEmail,
          senderName: existingPayment.senderName || senderName,
          recipientEmail: existingPayment.recipientEmail || recipientEmail,
          recipientName: existingPayment.recipientName || recipientName,
          amount: existingPayment.amount,
          currency: existingPayment.currency || "INR",
          paymentMethod: "UPI",
          upiReference: existingPayment.upiReference,
          mediaType: existingPayment.mediaType || normalizedMediaType,
          featureType: existingPayment.featureType || featureType,
          status: existingPayment.status || "PENDING",
          mediaStatus: existingPayment.mediaStatus || "AWAITING_RECORDING",
          mediaStorageKey: existingPayment.mediaStorageKey || null,
          hasMediaAttachment: Boolean(existingPayment.hasMediaAttachment),
          createdAt: existingPayment.createdAt instanceof Date ? existingPayment.createdAt.toISOString() : existingPayment.createdAt,
          updatedAt: existingPayment.updatedAt instanceof Date ? existingPayment.updatedAt.toISOString() : existingPayment.updatedAt
        },
        message: "Existing pending UPI payment reference returned."
      });
    }
    const paymentId = new ObjectId();
    const paymentIdStr = `PAY-${paymentId.toString().slice(-8).toUpperCase()}`;
    const now = /* @__PURE__ */ new Date();
    const paymentRecord = {
      _id: paymentId,
      paymentId: paymentIdStr,
      letterId: letter ? letter._id.toString() : input.letterId || void 0,
      userId: userId.toString(),
      userEmail,
      senderName,
      recipientEmail,
      recipientName,
      featureType,
      mediaType: normalizedMediaType,
      featureCode: input.featureCode || normalizedMediaType,
      amount: input.amount,
      currency: "INR",
      paymentMethod: "UPI",
      upiReference: cleanUpi,
      status: "PENDING",
      mediaStatus: "AWAITING_RECORDING",
      mediaStorageKey: null,
      hasMediaAttachment: false,
      paymentScreenshotId: input.screenshotUrl || void 0,
      adminNote: null,
      verifiedBy: null,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now
    };
    await paymentsColl.insertOne(paymentRecord);
    if (letter) {
      try {
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: letter._id,
          eventType: "PAYMENT_CREATED",
          metadata: { paymentId: paymentIdStr, amount: input.amount, upiReference: cleanUpi, mediaType: normalizedMediaType },
          createdAt: now
        });
      } catch {
      }
    }
    try {
      const payMailRes = await sendPaymentSubmittedSenderEmail({
        senderEmail: userEmail,
        senderName,
        paymentId: paymentIdStr,
        upiReference: cleanUpi,
        amount: input.amount,
        currency: "INR",
        mediaType: normalizedMediaType,
        recipientName: recipientName || void 0,
        letterReference: letter?.trackingCode || input.letterId || void 0
      });
      logEmailDispatch({
        type: "PAYMENT_SUBMITTED",
        to: userEmail,
        letterId: paymentRecord.letterId || "",
        paymentId: paymentIdStr,
        dispatchRef: paymentIdStr,
        status: payMailRes.success ? "SENT" : "FAILED",
        error: payMailRes.error,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (emailErr) {
      logEmailDispatch({
        type: "PAYMENT_SUBMITTED",
        to: userEmail,
        letterId: paymentRecord.letterId || "",
        paymentId: paymentIdStr,
        dispatchRef: paymentIdStr,
        status: "FAILED",
        error: emailErr.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    res.status(201).json({
      success: true,
      paymentId: paymentIdStr,
      id: paymentId.toString(),
      payment: {
        id: paymentId.toString(),
        paymentId: paymentIdStr,
        letterId: paymentRecord.letterId || null,
        userId: userId.toString(),
        userEmail,
        senderName,
        recipientEmail,
        recipientName,
        amount: input.amount,
        currency: "INR",
        paymentMethod: "UPI",
        upiReference: cleanUpi,
        mediaType: normalizedMediaType,
        featureType,
        status: "PENDING",
        mediaStatus: "AWAITING_RECORDING",
        mediaStorageKey: null,
        hasMediaAttachment: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      message: "UPI payment submitted. Awaiting administrative verification."
    });
  } catch (err) {
    console.error("[OLD-LETTERS Payment Error]", err);
    if (err?.code === 11e3 || err?.message?.includes("E11000 duplicate key error") || err?.message?.includes("duplicate key")) {
      return res.status(409).json({
        success: false,
        error: "This UPI reference / UTR number has already been registered in the bureau ledger. Please check your transaction reference."
      });
    }
    const isDbUnavailable = err?.message?.includes("Database connection unavailable") || err?.message?.includes("MongoDB Atlas connection unavailable") || err?.message?.includes("MONGODB_URI is missing or invalid") || err?.message?.includes("querySrv") || err?.message?.includes("ENOTFOUND") || err?.message?.includes("ETIMEDOUT") || err?.name === "MongoServerSelectionError" || err?.name === "MongoNetworkError";
    const statusCode = isDbUnavailable ? 503 : 500;
    const clientMsg = isDbUnavailable ? "Payment could not be registered because the payment service is temporarily unavailable. Please try again." : err.message || "Payment submission could not be completed.";
    res.status(statusCode).json({ success: false, error: clientMsg });
  }
});
app.post(["/api/payments/:id/media", "/api/letters/:id/media", "/payments/:id/media", "/letters/:id/media"], requireAuth, async (req, res) => {
  try {
    const rawId = (req.params.id || req.body?.paymentId || "").trim();
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const lettersColl = db.collection("letters");
    const mediaMetadataColl = db.collection("mediaMetadata");
    const userId = req.user.id;
    const now = /* @__PURE__ */ new Date();
    if (!rawId || rawId === "undefined" || rawId === "null") {
      return res.status(400).json({
        success: false,
        error: "A valid payment reference ID is required to link media enclosures."
      });
    }
    const lookupConditions = [
      { paymentId: rawId },
      { paymentId: rawId.toUpperCase() },
      { letterId: rawId },
      { upiReference: rawId },
      { _id: rawId }
    ];
    if (ObjectId.isValid(rawId)) {
      try {
        lookupConditions.unshift({ _id: new ObjectId(rawId) });
      } catch {
      }
    }
    if (req.body?.paymentId && req.body.paymentId !== rawId) {
      const altId = req.body.paymentId.trim();
      lookupConditions.push({ paymentId: altId });
      lookupConditions.push({ paymentId: altId.toUpperCase() });
      if (ObjectId.isValid(altId)) {
        try {
          lookupConditions.push({ _id: new ObjectId(altId) });
        } catch {
        }
      }
    }
    let payment = await paymentsColl.findOne({ $or: lookupConditions });
    if (!payment) {
      payment = await paymentsColl.findOne(
        {
          $or: [
            { userId: userId.toString() },
            ...ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : [],
            ...req.user?.email ? [{ userEmail: req.user.email.toLowerCase() }] : []
          ],
          status: "PENDING"
        },
        { sort: { createdAt: -1 } }
      );
    }
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: `Associated payment record not found. Please ensure payment is submitted before uploading media.`
      });
    }
    const isOwner = payment.userId?.toString() === userId.toString() || ObjectId.isValid(userId) && payment.userId?.toString() === new ObjectId(userId).toString();
    const isAdmin = await verifyAdminServerSide(req);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied: You can only attach media to your own payment." });
    }
    let buffer = null;
    let mimeType = "audio/webm";
    let durationSeconds = 0;
    if (req.body && req.body.data) {
      const base64Data = req.body.data.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
      mimeType = req.body.mimeType || (payment.mediaType === "VIDEO" ? "video/webm" : "audio/webm");
      durationSeconds = Number(req.body.durationSeconds) || 0;
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      mimeType = req.headers["content-type"] || (payment.mediaType === "VIDEO" ? "video/webm" : "audio/webm");
    }
    const clientIp = getClientIp(req);
    const ipAllowed = await checkDistributedRateLimit(req, res, `ip:media_upload:${clientIp}`, 30, 60 * 60 * 1e3);
    if (!ipAllowed) {
      return res.status(429).json({ success: false, error: "Too many media uploads from this network. Please wait an hour." });
    }
    const userAllowed = await checkDistributedRateLimit(req, res, `user:media_upload:${userId}`, 20, 60 * 60 * 1e3);
    if (!userAllowed) {
      return res.status(429).json({ success: false, error: "Media upload quota reached. Please wait an hour." });
    }
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: "No media binary received in request." });
    }
    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: "Media attachment exceeds maximum allowed size (25 MB)." });
    }
    if (durationSeconds > 600) {
      return res.status(400).json({ success: false, error: "Media recording exceeds maximum duration limit of 10 minutes." });
    }
    const sigCheck = validateMediaSignature(buffer);
    if (!sigCheck.valid) {
      return res.status(400).json({ success: false, error: sigCheck.error || "Invalid media signature." });
    }
    const mediaType = payment.mediaType || (mimeType.toLowerCase().includes("video") ? "VIDEO" : "VOICE");
    const storageKey = `media_${Date.now()}_${crypto2.randomBytes(8).toString("hex")}`;
    const filename = `${storageKey}.${mediaType === "VIDEO" ? "webm" : "webm"}`;
    const gridResult = await uploadGridFSBuffer("letterMedia", filename, buffer, {
      paymentId: payment._id.toString(),
      letterId: payment.letterId || "",
      userId: userId.toString(),
      mimeType,
      mediaType,
      durationSeconds
    });
    const mediaDoc = {
      _id: new ObjectId(),
      letterId: payment.letterId || "",
      paymentId: payment._id.toString(),
      userId: userId.toString(),
      mediaType,
      mediaStatus: "PENDING",
      storageKey,
      mimeType,
      fileSize: buffer.length,
      durationSeconds,
      gridFsFileId: gridResult.fileId,
      createdAt: now,
      updatedAt: now
    };
    await mediaMetadataColl.insertOne(mediaDoc);
    await paymentsColl.updateOne(
      { _id: payment._id },
      {
        $set: {
          mediaStorageKey: storageKey,
          hasMediaAttachment: true,
          mediaType,
          mediaStatus: "PENDING",
          updatedAt: now
        }
      }
    );
    if (payment.letterId) {
      try {
        const lId = ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId;
        await lettersColl.updateOne(
          { _id: lId },
          {
            $set: {
              hasMediaAttachment: true,
              mediaType,
              mediaStorageKey: storageKey,
              mediaPaymentId: payment._id.toString(),
              mediaStatus: "PENDING",
              updatedAt: now
            }
          }
        );
      } catch {
      }
    }
    res.status(201).json({
      success: true,
      storageKey,
      mediaType,
      mediaStatus: "PENDING",
      fileSize: buffer.length,
      durationSeconds,
      paymentId: payment.paymentId || payment._id.toString(),
      message: "Media recording successfully stored in private GridFS vault and linked to payment."
    });
  } catch (err) {
    console.error("[OLD-LETTERS Media Upload Error]", err);
    const isDbUnavailable = err?.message?.includes("Database connection unavailable") || err?.message?.includes("MongoDB Atlas connection unavailable") || err?.message?.includes("GridFS storage unavailable") || err?.message?.includes("MONGODB_URI is missing or invalid") || err?.message?.includes("querySrv") || err?.message?.includes("ENOTFOUND") || err?.message?.includes("ETIMEDOUT") || err?.name === "MongoServerSelectionError" || err?.name === "MongoNetworkError";
    const statusCode = isDbUnavailable ? 503 : 500;
    const clientMsg = isDbUnavailable ? "The postal media vault is temporarily unavailable. Please try again in a few moments." : err.message || "Failed to upload media enclosure.";
    res.status(statusCode).json({ success: false, error: clientMsg });
  }
});
app.get(["/api/admin/media/:storageKey", "/admin/media/:storageKey", "/api/media/:storageKey", "/media/:storageKey"], requireAdmin, async (req, res) => {
  try {
    const storageKey = req.params.storageKey;
    const db = await getDb();
    const mediaColl = db.collection("mediaMetadata");
    const media = await mediaColl.findOne({ storageKey });
    if (!media || !media.gridFsFileId) {
      return res.status(404).json({ success: false, error: "Media file not found in vault." });
    }
    const download = await downloadGridFSBuffer("letterMedia", media.gridFsFileId);
    if (!download) {
      return res.status(404).json({ success: false, error: "Media stream not found in GridFS." });
    }
    res.setHeader("Content-Type", media.mimeType || (media.mediaType === "VIDEO" ? "video/webm" : "audio/webm"));
    res.setHeader("Content-Length", download.buffer.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.send(download.buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get(["/api/delivery/media/:token", "/api/delivery/media/:token/:storageKey", "/delivery/media/:token", "/delivery/media/:token/:storageKey"], async (req, res) => {
  try {
    const token = req.params.token;
    const db = await getDb();
    const tokensColl = db.collection("deliveryTokens");
    const lettersColl = db.collection("letters");
    const paymentsColl = db.collection("payments");
    const mediaColl = db.collection("mediaMetadata");
    const tokenHash = hashSha2562(token);
    const tokenDoc = await tokensColl.findOne({
      $or: [{ tokenHash }, { rawToken: token }, { letterId: token }]
    });
    if (!tokenDoc) {
      return res.status(404).json({ success: false, error: "Invalid delivery token." });
    }
    const letter = await lettersColl.findOne({ _id: new ObjectId(tokenDoc.letterId.toString()) });
    if (!letter) {
      return res.status(404).json({ success: false, error: "Letter not found." });
    }
    const nowMs = Date.now();
    const { ms: deliveryTimeMs } = resolveDeliveryDate(letter);
    const isDeliveredByStatus = letter.status === "DELIVERED" || letter.status === "OPENED" || letter.status === "COMPLETED";
    const isArrived = isDeliveredByStatus || nowMs >= deliveryTimeMs;
    if (!isArrived) {
      return res.status(403).json({ success: false, error: "Sealed in transit. Media is locked until arrival." });
    }
    const verificationMethod = letter.recipientVerificationMethod || "open";
    if (verificationMethod !== "open") {
      const isVerified = isRecipientSessionVerified(req, letter._id.toString());
      if (!isVerified) {
        return res.status(403).json({
          success: false,
          error: "Recipient identity verification (OTP or cipher passphrase) required before streaming personal media attachment.",
          verificationRequired: true,
          verificationMethod
        });
      }
    }
    const payment = await paymentsColl.findOne({
      $or: [
        { letterId: letter._id.toString() },
        ...letter.trackingCode ? [{ letterId: letter.trackingCode }] : [],
        ...letter.mediaPaymentId ? [{ paymentId: letter.mediaPaymentId }, { _id: ObjectId.isValid(letter.mediaPaymentId) ? new ObjectId(letter.mediaPaymentId) : letter.mediaPaymentId }] : [],
        ...letter.personalMessage?.paymentId ? [{ paymentId: letter.personalMessage.paymentId }] : []
      ]
    });
    const media = await mediaColl.findOne({
      $or: [
        { letterId: letter._id.toString() },
        ...letter.mediaStorageKey ? [{ storageKey: letter.mediaStorageKey }] : [],
        ...letter.personalMessage?.mediaStorageKey ? [{ storageKey: letter.personalMessage.mediaStorageKey }] : [],
        ...payment ? [{ paymentId: payment._id.toString() }, { paymentId: payment.paymentId }] : []
      ]
    });
    if (!payment || payment.status !== "APPROVED" || !media || media.mediaStatus !== "APPROVED") {
      return res.status(404).json({
        success: false,
        error: "Personal voice/video message was not approved for delivery. Recipient receives letter only."
      });
    }
    if (media.mediaStatus === "DELETED" || !media.gridFsFileId) {
      return res.status(410).json({
        success: false,
        error: "This personal message has expired and been permanently deleted per retention policy."
      });
    }
    const download = await downloadGridFSBuffer("letterMedia", media.gridFsFileId);
    if (!download) {
      return res.status(404).json({ success: false, error: "Media stream not found in GridFS." });
    }
    res.setHeader("Content-Type", media.mimeType || (media.mediaType === "VIDEO" ? "video/webm" : "audio/webm"));
    res.setHeader("Content-Length", download.buffer.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.send(download.buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/user/media/:storageKey", requireAuth, async (req, res) => {
  try {
    const storageKey = req.params.storageKey;
    const db = await getDb();
    const mediaColl = db.collection("mediaMetadata");
    const userId = req.user.id;
    const media = await mediaColl.findOne({ storageKey });
    if (!media || !media.gridFsFileId) {
      return res.status(404).json({ success: false, error: "Media recording not found." });
    }
    const isOwner = media.userId?.toString() === userId.toString() || ObjectId.isValid(userId) && media.userId?.toString() === new ObjectId(userId).toString();
    const isAdmin = await verifyAdminServerSide(req);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied to this media recording." });
    }
    const download = await downloadGridFSBuffer("letterMedia", media.gridFsFileId);
    if (!download) {
      return res.status(404).json({ success: false, error: "Media file not found in vault." });
    }
    res.setHeader("Content-Type", media.mimeType || (media.mediaType === "VIDEO" ? "video/webm" : "audio/webm"));
    res.setHeader("Content-Length", download.buffer.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.send(download.buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get(["/api/payments", "/api/user/payments", "/payments", "/user/payments"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const lettersColl = db.collection("letters");
    const userId = req.user.id;
    const query = {
      $or: [
        { userId: userId.toString() },
        ...ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : [],
        ...req.user?.email ? [{ userEmail: req.user.email.toLowerCase() }] : []
      ]
    };
    const list = await paymentsColl.find(query).sort({ createdAt: -1 }).toArray();
    const featureDescriptions = {
      VOICE: "Audio Epistolary Wax Seal (Voice Message)",
      VIDEO: "Video Epistolary Parchment (Video Message)",
      VOICE_NOTE: "Audio Epistolary Wax Seal (Voice Message)",
      VIDEO_NOTE: "Video Epistolary Parchment (Video Message)",
      LIVE_MEETING: "Bureau Live Dispatch Meeting"
    };
    const enriched = await Promise.all(
      list.map(async (p) => {
        let recipientName = p.recipientName || "Postal Recipient";
        let recipientEmail = p.recipientEmail || "";
        let trackingCode = "OL-BUREAU";
        if (p.letterId) {
          try {
            const letter = await lettersColl.findOne({
              $or: [
                { _id: ObjectId.isValid(p.letterId) ? new ObjectId(p.letterId) : p.letterId },
                { trackingCode: p.letterId }
              ]
            });
            if (letter) {
              recipientName = letter.recipientName || recipientName;
              recipientEmail = letter.recipientEmail || recipientEmail;
              trackingCode = letter.trackingCode || trackingCode;
            }
          } catch {
          }
        }
        const mediaType = p.mediaType || (p.featureCode?.includes("VIDEO") ? "VIDEO" : "VOICE");
        return {
          id: p._id.toString(),
          paymentId: p.paymentId || `PAY-${p._id.toString().slice(-8).toUpperCase()}`,
          letterId: p.letterId || null,
          trackingCode,
          recipientName,
          recipientEmail,
          mediaType,
          featureCode: p.featureCode || mediaType,
          description: featureDescriptions[mediaType] || featureDescriptions[p.featureCode] || "Personal Message Enclosure",
          amount: p.amount,
          currency: p.currency || "INR",
          paymentMethod: p.paymentMethod || "UPI",
          upiReference: p.upiReference,
          status: p.status || "PENDING",
          mediaStatus: p.mediaStatus || "PENDING",
          mediaStorageKey: p.mediaStorageKey || null,
          hasMediaAttachment: Boolean(p.hasMediaAttachment),
          refundStatus: p.status === "REFUNDED" ? "REFUNDED" : "NONE",
          adminNote: p.adminNote || null,
          verifiedBy: p.verifiedBy || null,
          verifiedAt: p.verifiedAt ? p.verifiedAt instanceof Date ? p.verifiedAt.toISOString() : p.verifiedAt : null,
          createdAt: p.createdAt ? p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: p.updatedAt ? p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
        };
      })
    );
    res.json({
      success: true,
      payments: enriched
    });
  } catch (err) {
    console.error("[OLD-LETTERS List Payments Error]", err);
    const isDbUnavailable = err?.message?.includes("Database connection unavailable") || err?.message?.includes("MongoDB Atlas connection unavailable") || err?.message?.includes("MONGODB_URI is missing or invalid") || err?.message?.includes("querySrv") || err?.message?.includes("ENOTFOUND") || err?.message?.includes("ETIMEDOUT") || err?.name === "MongoServerSelectionError" || err?.name === "MongoNetworkError";
    const statusCode = isDbUnavailable ? 503 : 500;
    res.status(statusCode).json({ success: false, error: err.message, payments: [] });
  }
});
app.get(["/api/payments/:id", "/payments/:id"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const lettersColl = db.collection("letters");
    const userId = req.user.id;
    const paymentId = req.params.id;
    let payment = null;
    if (ObjectId.isValid(paymentId)) {
      payment = await paymentsColl.findOne({ _id: new ObjectId(paymentId) });
    }
    if (!payment) {
      payment = await paymentsColl.findOne({
        $or: [{ paymentId }, { upiReference: paymentId }, { _id: paymentId }]
      });
    }
    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment record not found." });
    }
    const isAdmin = await verifyAdminServerSide(req);
    const isOwner = payment.userId?.toString() === userId.toString() || ObjectId.isValid(userId) && payment.userId?.toString() === new ObjectId(userId).toString();
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied to this payment record." });
    }
    let recipientName = payment.recipientName || "Postal Recipient";
    let recipientEmail = payment.recipientEmail || "";
    let trackingCode = "OL-BUREAU";
    if (payment.letterId) {
      try {
        const letter = await lettersColl.findOne({
          $or: [
            { _id: ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId },
            { trackingCode: payment.letterId }
          ]
        });
        if (letter) {
          recipientName = letter.recipientName || recipientName;
          recipientEmail = letter.recipientEmail || recipientEmail;
          trackingCode = letter.trackingCode;
        }
      } catch {
      }
    }
    const mediaType = payment.mediaType || (payment.featureCode?.includes("VIDEO") ? "VIDEO" : "VOICE");
    res.json({
      success: true,
      payment: {
        id: payment._id.toString(),
        paymentId: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
        letterId: payment.letterId || null,
        trackingCode,
        recipientName,
        recipientEmail,
        mediaType,
        featureCode: payment.featureCode || mediaType,
        description: mediaType === "VIDEO" ? "Video Message Enclosure" : "Voice Message Enclosure",
        amount: payment.amount,
        currency: payment.currency || "INR",
        paymentMethod: payment.paymentMethod || "UPI",
        upiReference: payment.upiReference,
        status: payment.status || "PENDING",
        mediaStatus: payment.mediaStatus || "PENDING",
        mediaStorageKey: payment.mediaStorageKey || null,
        hasMediaAttachment: Boolean(payment.hasMediaAttachment),
        refundStatus: payment.status === "REFUNDED" ? "REFUNDED" : "NONE",
        adminNote: payment.adminNote || null,
        verifiedBy: payment.verifiedBy || null,
        verifiedAt: payment.verifiedAt ? payment.verifiedAt instanceof Date ? payment.verifiedAt.toISOString() : payment.verifiedAt : null,
        createdAt: payment.createdAt ? payment.createdAt instanceof Date ? payment.createdAt.toISOString() : payment.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: payment.updatedAt ? payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : payment.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get(["/api/admin/payments", "/admin/payments"], requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const lettersColl = db.collection("letters");
    const usersColl = db.collection("users");
    const list = await paymentsColl.find({}).sort({ createdAt: -1 }).toArray();
    const enriched = await Promise.all(
      list.map(async (p) => {
        let senderEmail = p.userEmail || "";
        let senderName = "Sender";
        let recipientEmail = p.recipientEmail || "";
        let recipientName = p.recipientName || "Recipient";
        let trackingCode = "OL-BUREAU";
        if (p.userId) {
          try {
            const user = await usersColl.findOne({
              $or: [
                { _id: ObjectId.isValid(p.userId) ? new ObjectId(p.userId) : p.userId },
                { email: p.userEmail }
              ]
            });
            if (user) {
              senderEmail = user.email || senderEmail;
              senderName = user.fullName || senderName;
            }
          } catch {
          }
        }
        if (p.letterId) {
          try {
            const letter = await lettersColl.findOne({
              $or: [
                { _id: ObjectId.isValid(p.letterId) ? new ObjectId(p.letterId) : p.letterId },
                { trackingCode: p.letterId }
              ]
            });
            if (letter) {
              recipientEmail = letter.recipientEmail || recipientEmail;
              recipientName = letter.recipientName || recipientName;
              trackingCode = letter.trackingCode || trackingCode;
              senderName = letter.senderName || senderName;
              senderEmail = letter.senderEmail || senderEmail;
            }
          } catch {
          }
        }
        const mediaType = p.mediaType || (p.featureCode?.includes("VIDEO") ? "VIDEO" : "VOICE");
        return {
          id: p._id.toString(),
          paymentId: p.paymentId || `PAY-${p._id.toString().slice(-8).toUpperCase()}`,
          userId: p.userId?.toString(),
          senderEmail,
          senderName,
          letterId: p.letterId?.toString() || null,
          trackingCode,
          recipientEmail,
          recipientName,
          mediaType,
          mediaStatus: p.mediaStatus || "PENDING",
          mediaStorageKey: p.mediaStorageKey || null,
          hasMediaAttachment: Boolean(p.hasMediaAttachment),
          mediaPreviewUrl: p.mediaStorageKey ? `/api/admin/media/${p.mediaStorageKey}` : null,
          featureCode: p.featureCode || mediaType,
          amount: p.amount,
          currency: p.currency || "INR",
          paymentMethod: p.paymentMethod || "UPI",
          upiReference: p.upiReference,
          paymentScreenshotPath: p.paymentScreenshotId,
          status: p.status || "PENDING",
          adminNote: p.adminNote || null,
          verifiedBy: p.verifiedBy || null,
          verifiedAt: p.verifiedAt ? p.verifiedAt instanceof Date ? p.verifiedAt.toISOString() : p.verifiedAt : null,
          createdAt: p.createdAt ? p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: p.updatedAt ? p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
        };
      })
    );
    res.json({
      success: true,
      payments: enriched
    });
  } catch (err) {
    console.error("[OLD-LETTERS Admin List Payments Error]", err);
    const isDbUnavailable = err?.message?.includes("Database connection unavailable") || err?.message?.includes("MongoDB Atlas connection unavailable") || err?.message?.includes("MONGODB_URI is missing or invalid") || err?.message?.includes("querySrv") || err?.message?.includes("ENOTFOUND") || err?.message?.includes("ETIMEDOUT") || err?.name === "MongoServerSelectionError" || err?.name === "MongoNetworkError";
    const statusCode = isDbUnavailable ? 503 : 500;
    res.status(statusCode).json({ success: false, error: err.message, payments: [] });
  }
});
app.post(["/api/admin/payments/:id/verify", "/api/admin/payments/:id/approve", "/api/admin/payments/:id/reject", "/admin/payments/:id/verify", "/admin/payments/:id/approve", "/admin/payments/:id/reject"], requireAdmin, async (req, res) => {
  try {
    const paymentId = req.params.id;
    let targetStatus = req.body.status;
    if (req.path.endsWith("/approve")) targetStatus = "APPROVED";
    if (req.path.endsWith("/reject")) targetStatus = "REJECTED";
    const parseResult = AdminVerifyPaymentSchema.safeParse({
      paymentId,
      status: targetStatus,
      adminNote: req.body.adminNote
    });
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((e) => e.message).join(", ")
      });
    }
    const { status, adminNote } = parseResult.data;
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const mediaMetadataColl = db.collection("mediaMetadata");
    const lettersColl = db.collection("letters");
    const auditColl = db.collection("auditLogs");
    const eventsColl = db.collection("deliveryEvents");
    const usersColl = db.collection("users");
    let payment = null;
    try {
      const payConds = [{ paymentId }, { upiReference: paymentId }];
      if (ObjectId.isValid(paymentId)) {
        payConds.unshift({ _id: new ObjectId(paymentId) });
      } else {
        payConds.unshift({ _id: paymentId });
      }
      payment = await paymentsColl.findOne({ $or: payConds });
    } catch {
      payment = await paymentsColl.findOne({ upiReference: paymentId });
    }
    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment record not found" });
    }
    const now = /* @__PURE__ */ new Date();
    const adminIdentifier = req.user.email;
    await paymentsColl.updateOne(
      { _id: payment._id },
      {
        $set: {
          status,
          mediaStatus: status,
          adminNote: adminNote || null,
          verifiedBy: adminIdentifier,
          verifiedAt: now,
          updatedAt: now
        }
      }
    );
    await mediaMetadataColl.updateMany(
      {
        $or: [
          { paymentId: payment._id.toString() },
          { paymentId: payment.paymentId },
          ...payment.letterId ? [{ letterId: payment.letterId }] : []
        ]
      },
      {
        $set: {
          mediaStatus: status,
          updatedAt: now
        }
      }
    );
    if (payment.letterId) {
      try {
        const lId = ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId;
        await lettersColl.updateOne(
          { _id: lId },
          {
            $set: {
              "personalMessage.mediaStatus": status,
              mediaStatus: status,
              updatedAt: now
            }
          }
        );
      } catch {
      }
    }
    await auditColl.insertOne({
      _id: new ObjectId(),
      action: status === "APPROVED" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
      adminId: adminIdentifier,
      adminEmail: adminIdentifier,
      paymentId: payment._id.toString(),
      entityType: "PAYMENT",
      entityId: payment._id.toString(),
      timestamp: now,
      metadata: {
        paymentId: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
        letterId: payment.letterId,
        mediaType: payment.mediaType,
        amount: payment.amount,
        upiReference: payment.upiReference,
        adminNote: adminNote || null
      }
    });
    if (payment.letterId) {
      try {
        const lId = ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId;
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: lId,
          eventType: status === "APPROVED" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
          metadata: { amount: payment.amount, mediaType: payment.mediaType },
          createdAt: now
        });
      } catch {
      }
    }
    const senderEmail = payment.userEmail || (payment.userId ? (await usersColl.findOne({ $or: [{ _id: ObjectId.isValid(payment.userId) ? new ObjectId(payment.userId) : payment.userId }, { email: payment.userEmail }] }))?.email : null);
    if (senderEmail) {
      if (status === "REJECTED") {
        try {
          const rejectMailRes = await sendPaymentIssueEmail({
            userEmail: senderEmail,
            orderReference: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
            amount: payment.amount || (payment.mediaType === "VIDEO" ? 149 : 99),
            currency: payment.currency || "INR",
            upiReference: payment.upiReference,
            adminNote: adminNote || "Payment transaction details could not be verified. Your correspondence will continue without the personal voice/video enclosure.",
            contactUrl: `${process.env.APP_URL || "https://oldletters.in"}/contact`
          });
          logEmailDispatch({
            type: "PAYMENT_REJECTED",
            to: senderEmail,
            letterId: payment.letterId || "",
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: rejectMailRes.success ? "SENT" : "FAILED",
            error: rejectMailRes.error,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (emailErr) {
          logEmailDispatch({
            type: "PAYMENT_REJECTED",
            to: senderEmail,
            letterId: payment.letterId || "",
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: "FAILED",
            error: emailErr.message,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } else if (status === "APPROVED") {
        try {
          const approveMailRes = await sendPaymentApprovedEmail({
            userEmail: senderEmail,
            orderReference: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
            amount: payment.amount || (payment.mediaType === "VIDEO" ? 149 : 99),
            currency: payment.currency || "INR",
            upiReference: payment.upiReference,
            featureName: payment.mediaType === "VIDEO" ? "Video Message Enclosure" : "Voice Message Enclosure",
            adminNote: adminNote || void 0,
            statusUrl: `${process.env.APP_URL || "https://oldletters.in"}/bureau`
          });
          logEmailDispatch({
            type: "PAYMENT_APPROVED",
            to: senderEmail,
            letterId: payment.letterId || "",
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: approveMailRes.success ? "SENT" : "FAILED",
            error: approveMailRes.error,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (emailErr) {
          logEmailDispatch({
            type: "PAYMENT_APPROVED",
            to: senderEmail,
            letterId: payment.letterId || "",
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: "FAILED",
            error: emailErr.message,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    }
    const updatedPayment = await paymentsColl.findOne({ _id: payment._id });
    res.json({
      success: true,
      message: `Payment marked as ${status}.`,
      payment: updatedPayment ? {
        id: updatedPayment._id.toString(),
        paymentId: updatedPayment.paymentId || `PAY-${updatedPayment._id.toString().slice(-8).toUpperCase()}`,
        status: updatedPayment.status,
        mediaStatus: updatedPayment.mediaStatus,
        verifiedBy: updatedPayment.verifiedBy,
        verifiedAt: updatedPayment.verifiedAt ? updatedPayment.verifiedAt instanceof Date ? updatedPayment.verifiedAt.toISOString() : updatedPayment.verifiedAt : null,
        adminNote: updatedPayment.adminNote
      } : void 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const auditColl = db.collection("auditLogs");
    const logs = await (await auditColl.find({})).sort({ timestamp: -1 }).toArray();
    res.json({ success: true, auditLogs: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/robots.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  const pubFile = path.resolve(__dirname, "public", "robots.txt");
  const distFile = path.resolve(__dirname, "dist", "robots.txt");
  if (fs.existsSync(pubFile)) {
    return res.sendFile(pubFile);
  }
  if (fs.existsSync(distFile)) {
    return res.sendFile(distFile);
  }
  return res.status(404).send("User-agent: *\nAllow: /\n");
});
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  const pubFile = path.resolve(__dirname, "public", "sitemap.xml");
  const distFile = path.resolve(__dirname, "dist", "sitemap.xml");
  if (fs.existsSync(pubFile)) {
    return res.sendFile(pubFile);
  }
  if (fs.existsSync(distFile)) {
    return res.sendFile(distFile);
  }
  return res.status(404).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
});
app.all(["/api", "/api/*"], (req, res) => {
  res.status(404).json({
    success: false,
    error: `Postal API endpoint not found: ${req.method} ${req.path}`
  });
});
app.use((err, req, res, next) => {
  console.error("[OLD-LETTERS API Error]", err);
  if (req.path.startsWith("/api")) {
    const isProd2 = process.env.NODE_ENV === "production";
    const status = typeof err.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
    const isClientError = status < 500;
    const rawMsg = err.message || "";
    let safeMessage = rawMsg;
    if (isProd2 && (!isClientError || rawMsg.includes("mongodb") || rawMsg.includes("Mongo") || rawMsg.includes("topology"))) {
      safeMessage = "An unexpected postal bureau error occurred. Please try again later.";
    }
    return res.status(status).json({
      success: false,
      error: safeMessage || "An unexpected postal bureau error occurred."
    });
  }
  next(err);
});
async function startServer() {
  const uri = getSanitizedMongoUri();
  if (uri) {
    try {
      await setupDatabaseIndexes();
      await seedDatabase();
    } catch (seedErr) {
      console.warn("[OLD-LETTERS] Seeding notice:", seedErr);
    }
  } else {
    console.log("[OLD-LETTERS] MONGODB_URI not configured. Database initialization deferred until MONGODB_URI is set.");
  }
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    const KNOWN_CLIENT_ROUTES = /* @__PURE__ */ new Set([
      "/",
      "/how-it-works",
      "/cookies",
      "/privacy",
      "/terms",
      "/profile",
      "/account",
      "/bureau",
      "/admin",
      "/admin/dashboard",
      "/composer",
      "/archive",
      "/recipient",
      "/login",
      "/signup"
    ]);
    app.get("*", (req, res) => {
      const cleanPath = req.path.toLowerCase().replace(/\/+$/, "") || "/";
      const isKnownRoute = KNOWN_CLIENT_ROUTES.has(cleanPath) || cleanPath.startsWith("/letter/") || cleanPath.startsWith("/recipient/");
      if (isKnownRoute) {
        res.status(200).sendFile(path.resolve(__dirname, "dist", "index.html"));
      } else {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
        res.status(404).sendFile(path.resolve(__dirname, "dist", "index.html"));
      }
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OLD-LETTERS] Bureau server active on port ${PORT}`);
  });
  setInterval(async () => {
    try {
      if (!getSanitizedMongoUri()) {
        return;
      }
      const db = await getDb();
      await runDeliveryScheduler(db);
    } catch (schedErr) {
      console.warn("[OLD-LETTERS Scheduler Notice]", schedErr);
    }
  }, 30 * 1e3);
}
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  startServer();
}
var server_default = app;
export {
  app,
  server_default as default,
  getClientIp,
  parseToMs,
  resolveDeliveryDate,
  runDeliveryScheduler,
  validateMediaSignature,
  validateScreenshotUrl
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OLD-LETTERS Central Mailroom Service
 * Gmail SMTP Transactional Email Dispatcher via Nodemailer
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Security & Validation Utilities for OLD-LETTERS
 * 1. IP extraction with proxy awareness
 * 2. Media file signature validation & anti-malware verification
 * 3. Screenshot URL validation & SSRF prevention
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical Delivery Date & Timing Authority for OLD-LETTERS.
 * Enforces exact Unix millisecond / UTC comparisons and authoritative delivery calculations.
 */
