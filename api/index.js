// server.ts
import express from "express";
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
  console.log(`[OLD-LETTERS EMAIL]
type: ${entry.type}
to: ${entry.to}
letterId: ${entry.letterId}
dispatchRef: ${entry.dispatchRef}
status: ${entry.status}${entry.error ? `
error: ${entry.error}` : ""}`);
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
function emailWrapper(title, subtitle, contentHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f7; font-family: 'Times New Roman', Times, serif; color: #141618; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf9f7; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #eae4da; border-radius: 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow: hidden;">
          <!-- Postal Header Band -->
          <tr>
            <td style="padding: 24px 32px; background-color: #134e4a; text-align: center; border-bottom: 3px solid #0f3d3a;">
              <span style="display: block; font-size: 16px; font-weight: normal; letter-spacing: 0.25em; color: #f2ede4; text-transform: uppercase; margin-bottom: 4px;">OLD-LETTERS</span>
              <span style="display: block; font-size: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.2em; color: #b7cfcc; text-transform: uppercase;">Central Correspondence Bureau</span>
            </td>
          </tr>

          <!-- Docket & Subtitle -->
          <tr>
            <td style="padding: 24px 32px 8px 32px; text-align: center;">
              <span style="font-size: 10px; font-family: monospace, Courier; letter-spacing: 0.2em; text-transform: uppercase; color: #78716c; background-color: #f5f3ef; padding: 4px 10px; border-radius: 2px; border: 1px solid #e7e3dc;">${subtitle}</span>
              <h1 style="font-size: 24px; font-weight: 400; color: #134e4a; margin: 16px 0 8px 0; line-height: 1.3;">${title}</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 12px 32px 32px 32px; font-size: 14px; line-height: 1.7; color: #44403c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Postal Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #faf9f7; border-top: 1px solid #eae4da; text-align: center; font-size: 11px; font-family: serif; font-style: italic; color: #78716c;">
              &ldquo;Some things are worth waiting for.&rdquo;<br>
              <span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-style: normal; font-size: 10px; color: #a8a29e; margin-top: 4px; display: inline-block;">
                Held in archival trust \xB7 Hyderabad Postal Registry
              </span>
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
          CHECK IN-TRANSIT STATUS \u2192
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
  const subject = "Your letter is ready to be opened \xB7 OLD-LETTERS";
  const html = emailWrapper(
    "Your letter is ready to be opened \xB7 OLD-LETTERS",
    `DISPATCH REF: ${params.trackingCode}`,
    `
      <p style="margin-top: 0;">Dear ${params.recipientName},</p>
      <p style="font-size: 16px; color: #134e4a; font-family: serif; font-style: italic;">
        Your letter has arrived. The 48-hour wait is complete. The seal may now be broken.
      </p>
      <p>
        Your correspondence has completed its journey and is ready to be unsealed.
      </p>
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
          UNSEAL YOUR LETTER \u2192
        </a>
      </div>
    `
  );
  return sendMail({
    to: params.recipientEmail,
    subject,
    html,
    text: `Your letter (Ref: ${params.trackingCode}) has arrived! The 48-hour wait is complete. Unseal and read your letter now: ${params.recipientUrl}`
  });
}

// src/types/backend.ts
import { z } from "zod";
var MIN_DELIVERY_HOURS = 48;
var CreateLetterSchema = z.object({
  type: z.string().min(1),
  templateId: z.string().default("ivory"),
  senderName: z.string().min(1, "Sender name is required").max(100),
  senderEmail: z.string().email("Valid sender email required"),
  recipientName: z.string().min(1, "Recipient name is required").max(100),
  recipientEmail: z.string().email("Valid recipient email required"),
  greeting: z.string().min(1, "Salutation greeting is required"),
  content: z.string().min(1, "Letter body content is required"),
  signoff: z.string().min(1, "Signoff is required"),
  verificationMethod: z.enum(["otp", "passphrase", "open"]).default("open"),
  passphrase: z.string().optional(),
  scheduledDeliveryAt: z.string().refine((val) => {
    const deliveryDate = new Date(val).getTime();
    const minTime = Date.now() + (MIN_DELIVERY_HOURS - 1) * 3600 * 1e3;
    return !isNaN(deliveryDate) && deliveryDate >= minTime;
  }, {
    message: `Delivery date must be at least ${MIN_DELIVERY_HOURS} hours in the future`
  }),
  waitingHours: z.number().min(48, "Minimum 48 hours required").default(48),
  postmarkCity: z.string().optional().default("Hyderabad Bureau"),
  status: z.enum(["DRAFT", "SCHEDULED"]).default("SCHEDULED")
});
var SubmitPaymentSchema = z.object({
  letterId: z.string().optional().nullable(),
  featureCode: z.enum(["VOICE_NOTE", "VIDEO_NOTE", "LIVE_MEETING"]),
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  upiReference: z.string().min(6, "Valid UPI reference / UTR number required").max(50),
  screenshotUrl: z.string().optional().nullable()
});
var AdminVerifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().max(500).optional()
});
var RecipientVerifySchema = z.object({
  token: z.string().min(16),
  verificationMethod: z.enum(["otp", "passphrase", "open"]).optional(),
  otp: z.string().length(6).optional(),
  passphrase: z.string().optional()
});

// src/lib/mongodb.ts
import { MongoClient, ObjectId, GridFSBucket } from "mongodb";
var MemoryCollection = class {
  constructor() {
    this.docs = /* @__PURE__ */ new Map();
  }
  find(query = {}) {
    const list = Array.from(this.docs.values()).filter((doc) => this.matchQuery(doc, query));
    return {
      toArray: async () => list,
      sort: (sortObj) => ({
        toArray: async () => {
          const keys = Object.keys(sortObj);
          return [...list].sort((a, b) => {
            for (const key of keys) {
              const dir = sortObj[key] === 1 ? 1 : -1;
              const valA = a[key];
              const valB = b[key];
              if (valA < valB) return -1 * dir;
              if (valA > valB) return 1 * dir;
            }
            return 0;
          });
        }
      })
    };
  }
  async findOne(query) {
    for (const doc of this.docs.values()) {
      if (this.matchQuery(doc, query)) {
        return doc;
      }
    }
    return null;
  }
  async insertOne(doc) {
    const newDoc = {
      ...doc,
      _id: doc._id || new ObjectId()
    };
    this.docs.set(newDoc._id.toString(), newDoc);
    return { insertedId: newDoc._id, acknowledged: true };
  }
  async insertMany(docs) {
    const insertedIds = {};
    let idx = 0;
    for (const doc of docs) {
      const newDoc = {
        ...doc,
        _id: doc._id || new ObjectId()
      };
      this.docs.set(newDoc._id.toString(), newDoc);
      insertedIds[idx++] = newDoc._id;
    }
    return { insertedIds, acknowledged: true };
  }
  async updateOne(filter, update) {
    const doc = await this.findOne(filter);
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        doc[k] = (doc[k] || 0) + v;
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async updateMany(filter, update) {
    let matchedCount = 0;
    let modifiedCount = 0;
    for (const doc of this.docs.values()) {
      if (this.matchQuery(doc, filter)) {
        matchedCount++;
        if (update.$set) {
          Object.assign(doc, update.$set);
          modifiedCount++;
        }
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) {
            doc[k] = (doc[k] || 0) + v;
          }
          modifiedCount++;
        }
      }
    }
    return { matchedCount, modifiedCount };
  }
  async deleteOne(filter) {
    for (const [id, doc] of this.docs.entries()) {
      if (this.matchQuery(doc, filter)) {
        this.docs.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }
  async deleteMany(filter) {
    let deletedCount = 0;
    for (const [id, doc] of Array.from(this.docs.entries())) {
      if (this.matchQuery(doc, filter)) {
        this.docs.delete(id);
        deletedCount++;
      }
    }
    return { deletedCount };
  }
  async findOneAndUpdate(filter, update) {
    const doc = await this.findOne(filter);
    if (!doc) return null;
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    return doc;
  }
  async countDocuments(query = {}) {
    let count = 0;
    for (const doc of this.docs.values()) {
      if (this.matchQuery(doc, query)) count++;
    }
    return count;
  }
  async createIndex() {
    return "index_created";
  }
  matchQuery(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;
    if (query.$or && Array.isArray(query.$or)) {
      const matchAny = query.$or.some((subQuery) => this.matchQuery(doc, subQuery));
      if (!matchAny) return false;
    }
    if (query.$and && Array.isArray(query.$and)) {
      const matchAll = query.$and.every((subQuery) => this.matchQuery(doc, subQuery));
      if (!matchAll) return false;
    }
    for (const [k, v] of Object.entries(query)) {
      if (k === "$or" || k === "$and") continue;
      if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof ObjectId)) {
        if ("$lte" in v && !(doc[k] <= v.$lte)) return false;
        if ("$gte" in v && !(doc[k] >= v.$gte)) return false;
        if ("$eq" in v && doc[k] !== v.$eq) return false;
        if ("$ne" in v && doc[k] === v.$ne) return false;
        if ("$in" in v && !v.$in.includes(doc[k])) return false;
      } else if (k === "_id" || k === "senderId" || k === "letterId" || k === "userId") {
        const idStr = v?.toString();
        const docIdStr = doc[k]?.toString();
        if (idStr !== docIdStr) return false;
      } else if (doc[k] !== v) {
        return false;
      }
    }
    return true;
  }
};
var MemoryDb = class {
  constructor() {
    this.collections = /* @__PURE__ */ new Map();
  }
  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection());
    }
    return this.collections.get(name);
  }
};
var uri = process.env.MONGODB_URI || "";
var clientPromise = null;
var isRealMongo = false;
if (uri && (uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://"))) {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5e3
      });
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5e3
    });
    clientPromise = client.connect();
  }
  isRealMongo = true;
}
function isUsingAtlas() {
  return isRealMongo;
}
async function getMongoClient() {
  if (clientPromise) {
    try {
      return await clientPromise;
    } catch (err) {
      console.warn("[OLD-LETTERS MongoDB] Atlas connection error, using resilient fallback:", err);
      return null;
    }
  }
  return null;
}
async function getDb(dbName) {
  const client = await getMongoClient();
  if (client) {
    return client.db(dbName || process.env.MONGODB_DB_NAME || "oldletters");
  }
  if (!global._memoryDbInstance) {
    global._memoryDbInstance = new MemoryDb();
  }
  return global._memoryDbInstance;
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
    const deliveryEvents = db.collection("deliveryEvents");
    await deliveryEvents.createIndex({ letterId: 1 });
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
      markings: "CORRESPONDENCE BUREAU \xB7 DECCAN PAPERS \xB7 WATERMARK EST. 1926"
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
      postmarkText: "HYDERABAD CENTRAL G.P.O.",
      cachetCity: "Hyderabad Bureau",
      docketNumber: "EP-1892",
      stampName: "Imperial Ashoka 25p",
      stampIllustration: "\u{1F981}",
      cancellationDate: "12 OCT 2026"
    },
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nSome thoughts are too quiet for telephone calls, and too sacred for instant messages. I wanted you to hold these words in your hands, knowing they were written with stillness and patient care.",
    sampleSignoff: "With affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
      description: "Deccan night sky map at 02:00 AM, mapping Orion, Ursa Major, and the southern horizon.",
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
      postmarkText: "HYDERABAD MIDNIGHT DISPATCH",
      cachetCity: "Banjara Hills",
      docketNumber: "NC-0214",
      stampName: "Crescent Moon 50p",
      stampIllustration: "\u{1F319}",
      cancellationDate: "14 OCT 2026"
    },
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "The city lights below Banjara Hills have finally blinked out one by one.\n\nMidnight has a way of stripping away every pretence. I am writing to you because in the quietest silence of the day, your voice is still the one I hear most clearly.\n\nUnder this canopy of stars, take this letter as my promise to remain beside you through every season.",
    sampleSignoff: "Under the same stars,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
      postmarkText: "VIZAG CEREMONIAL REGISTRY",
      cachetCity: "Vizag Bureau",
      docketNumber: "VL-882",
      stampName: "Heraldic Fleur-de-lis 1R",
      stampIllustration: "\u269C",
      cancellationDate: "25 OCT 2026"
    },
    sampleSalutation: "Respected Satya,",
    sampleBody: "A milestone such as yours comes once in a generation.\n\nWatching you build your institute in Vizag with quiet dignity has been an inspiration to all of us. Please accept this formal testament of our highest esteem and pride.\n\nMay this document preserve our gratitude for your guidance through the years.",
    sampleSignoff: "With enduring respect,",
    sampleRecipient: "Satya",
    sampleSender: "Vijay & Lokesh",
    sampleCity: "Vizag",
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
      postmarkText: "HYDERABAD HEARTS DESPATCH",
      cachetCity: "Hyderabad Bureau",
      docketNumber: "LL-0921",
      stampName: "Crimson Dove 20p",
      stampIllustration: "\u{1F54A}",
      cancellationDate: "04 DEC 2026"
    },
    sampleSalutation: "My Beloved Vasantha,",
    sampleBody: "In a world that hurries through every feeling, I wanted to build a sanctuary for ours.\n\nEvery time my train pulls into Secunderabad station, my eyes search for you in the crowd. Time has only deepened what I first saw in your eyes.\n\nI fold this letter with the certainty that whatever comes next, we face it together.",
    sampleSignoff: "Yours, always and wholly,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nThere are feelings that defy casual conversation, emotions that only reveal themselves when given the quiet grace of a handwritten page. You have my heart, now and always.",
    sampleSignoff: "With affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life, and how deeply I regret the moments when I failed to show it.\n\nPlease know that this letter comes from an honest heart, with the hope that we can mend whatever silence has grown between us.",
    sampleSignoff: "With sincerity and affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life, and how grateful I am for every kindness you have shown me.\n\nYour generosity has made a quiet, lasting difference in my days. Thank you for being such an extraordinary friend.",
    sampleSignoff: "With deepest gratitude and affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nOn this wonderful day, I wanted to tell you how much I value your presence in my life, and celebrate everything that makes you who you are.\n\nMay the coming year bring you peace, deep joy, unexpected wonder, and good health. Wishing you the happiest of birthdays.",
    sampleSignoff: "With celebration and affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to celebrate this tremendous achievement with you and tell you how proud I am of all the quiet dedication that led to this moment.\n\nYou have earned this triumph through patience, resilience, and sheer resolve. Please accept my warmest and most admiring congratulations.",
    sampleSignoff: "With boundless pride and affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI know that recent days have asked a great deal of your spirit. I wanted to remind you of the strength you carry, and how deeply I believe in your path forward.\n\nTake this moment one breath at a time. Whatever storms arrive, they will pass, and you will emerge stronger than before.",
    sampleSignoff: "Standing beside you with affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nAs our paths divide and new chapters call, I wanted to write down what your presence has meant to me before distance settles in.\n\nThough miles and time will separate our daily lives, the gratitude and affection I carry for you will never fade. Safe travels, wherever tomorrow leads.",
    sampleSignoff: "With fondest farewell and affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleSalutation: "Dear Vasantha,",
    sampleBody: "I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nSome thoughts are too quiet for telephone calls, and too sacred for instant messages. I wanted you to hold these words in your hands, knowing they were written with stillness and patient care.",
    sampleSignoff: "With affection,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
      postmarkText: "BOMBAY AIR MAIL TRANSIT",
      cachetCity: "Bombay G.P.O.",
      airMailBadge: true,
      docketNumber: "AM-48H-IN",
      stampName: "Air Mail Constellation 50p",
      stampIllustration: "\u2708",
      cancellationDate: "15 NOV 2026"
    },
    sampleSalutation: "Dearest Sravani,",
    sampleBody: "The rains in Bengaluru are relentless this week, tapping against the glass just like the monsoon evenings we spent near Cubbon Park.\n\nEven across the miles between here and Vizag, this envelope carries my unwavering affection to your doorstep.\n\nWrite back as soon as this reaches your desk.",
    sampleSignoff: "Sent across the skies,",
    sampleRecipient: "Sravani",
    sampleSender: "Vijay",
    sampleCity: "Bengaluru",
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
      postmarkText: "VIZAG POSTAL DESK \xB7 RECORDED",
      cachetCity: "Vizag Port Division",
      docketNumber: "TW-48-26",
      stampName: "Telegraphic Dispatch 10p",
      stampIllustration: "\u26A1",
      cancellationDate: "18 OCT 2026"
    },
    sampleSalutation: "Dear Satya,",
    sampleBody: "The clatter of this typewriter keys has kept me company through midnight.\n\nThere is an honesty to letters written on steel hammers\u2014you cannot backspace, you cannot hide your thoughts. I am writing to remind you that your grit through these exams is something we all look up to.\n\nKeep your head high; the summit is near.",
    sampleSignoff: "Typed in fellowship,",
    sampleRecipient: "Satya",
    sampleSender: "Karthik",
    sampleCity: "Vizag",
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
      postmarkText: "MADRAS RESIDENCY DIARY",
      cachetCity: "Chennai",
      docketNumber: "PD-1926",
      stampName: "Fountain Nib 5p",
      stampIllustration: "\u2712",
      cancellationDate: "22 SEP 2026"
    },
    sampleSalutation: "Dear Harshitha,",
    sampleBody: "Sitting by the veranda at dawn. The morning filter coffee is steaming, and the parrots are in the guava tree outside.\n\nI wrote this entry with you in mind, thinking of the promises we made to never let distance turn our memories into strangers.\n\nMay this quiet page carry the morning calm directly into your hands.",
    sampleSignoff: "From my journal to yours,",
    sampleRecipient: "Harshitha",
    sampleSender: "Sravani",
    sampleCity: "Chennai",
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
      title: "Historical Deccan Photographic Plate",
      description: "Archival monochrome plate of Charminar & Old Hyderabad. Central Postal Historical Series.",
      markings: "POST CARD \xB7 CARTE POSTALE \xB7 SERIES 1892"
    },
    decorations: {
      headerMark: "POST CARD \xB7 CARTE POSTALE \xB7 INDIA POSTAGE",
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
      postmarkText: "OOTACAMUND R.M.S. SORTING",
      cachetCity: "Nilgiris Bureau",
      docketNumber: "PC-784",
      stampName: "Royal Elephant 25p",
      stampIllustration: "\u{1F418}",
      cancellationDate: "09 NOV 2026"
    },
    sampleSalutation: "Namaste Vijay,",
    sampleBody: "Greetings from the hills of Ooty! The eucalyptus mist rolls right over the roof.\n\nThought of you as soon as the narrow-gauge train pulled into the station. Keep this card propped on your bookshelf until we catch up next month.",
    sampleSignoff: "Warmest regards,",
    sampleRecipient: "Vijay",
    sampleSender: "Lokesh",
    sampleCity: "Bengaluru",
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
      postmarkText: "MUMBAI ARCHIVAL REPOSITORY",
      cachetCity: "Mumbai Fort",
      docketNumber: "PH-1948",
      stampName: "Silver Halide Camera 30p",
      stampIllustration: "\u{1F4F7}",
      cancellationDate: "30 OCT 2026"
    },
    sampleSalutation: "Dearest Sravani,",
    sampleBody: "I found this old print tucked inside an encyclopaedia at the British Council Library.\n\nIt made me smile all morning\u2014it captures the exact unforced laughter of that monsoon afternoon on Marine Drive. Some moments refuse to fade.\n\nMounted here so it remains safe for decades to come.",
    sampleSignoff: "Preserved with tenderness,",
    sampleRecipient: "Sravani",
    sampleSender: "Vijay",
    sampleCity: "Mumbai",
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
      description: "Lalbagh Botanical Gardens field classification. Preserved under archival linen binding.",
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
      postmarkText: "BENGALURU BOTANICAL GARDENS",
      cachetCity: "Lalbagh Division",
      docketNumber: "HB-1912",
      stampName: "Botanical Fern 20p",
      stampIllustration: "\u{1F33F}",
      cancellationDate: "05 NOV 2026"
    },
    sampleSalutation: "Dear Karthik,",
    sampleBody: "Specimen: Nelumbo nucifera \xB7 Dal Lake Collection.\n\nLike the lotus that roots in still waters and blooms immaculate toward the sun, your patience over these five arduous years has culminated in something rare and honorable.\n\nCatalogued here in lasting fellowship.",
    sampleSignoff: "Catalogued in friendship,",
    sampleRecipient: "Karthik",
    sampleSender: "Sathwik",
    sampleCity: "Bengaluru",
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
      cachetCity: "Hyderabad Vault",
      docketNumber: "CAP-2036-X",
      stampName: "Chrono Hourglass 5R",
      stampIllustration: "\u23F3",
      cancellationDate: "12 OCT 2036"
    },
    sampleSalutation: "To Harshitha of 2036,",
    sampleBody: "If this envelope reaches your hands as scheduled ten years from today, you are now thirty-four.\n\nI hope you still laugh with your whole body, I hope you still love filter coffee in brass tumblers, and I hope you never forgot how fearless you were today.\n\nLook back gently on this younger version of you who loved you before you even existed.",
    sampleSignoff: "Penned from the past with endless love,",
    sampleRecipient: "Harshitha",
    sampleSender: "Vasantha & Lokesh",
    sampleCity: "Hyderabad",
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
      description: "Pressed flora harvested at morning dew from Deccan gardens, dried between archival blotting boards.",
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
      postmarkText: "CHENNAI FLORAL BUREAU",
      cachetCity: "Chennai",
      docketNumber: "FL-2026",
      stampName: "Flora of Deccan 15p",
      stampIllustration: "\u{1F338}",
      cancellationDate: "28 OCT 2026"
    },
    sampleSalutation: "My Harshitha,",
    sampleBody: "I pressed a fresh jasmine blossom into the folds of this letter, gathered this morning from the courtyard garden.\n\nMay its memory greet you when you unfold the paper. Every petal reminds me of the gentle patience with which you listen.\n\nKeep this blossom between the pages of your favorite book.",
    sampleSignoff: "With quiet devotion,",
    sampleRecipient: "Harshitha",
    sampleSender: "Sathwik",
    sampleCity: "Chennai",
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
      postmarkText: "HYDERABAD CONFIDENTIAL ARCHIVE",
      cachetCity: "Secret Registry",
      docketNumber: "SEC-9904",
      stampName: "Cipher Key 50p",
      stampIllustration: "\u{1F5DD}",
      cancellationDate: "01 NOV 2026"
    },
    sampleSalutation: "Dearest Vasantha,",
    sampleBody: "Between you and me, locked beneath our private cipher.\n\nSome revelations belong strictly between two pairs of eyes and nowhere else in this noisy city.\n\nWhat is written here remains our sanctuary.",
    sampleSignoff: "In utmost secrecy,",
    sampleRecipient: "Vasantha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
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
    sampleRecipient: "Harshitha",
    sampleSender: "Lokesh",
    sampleCity: "Hyderabad",
    sampleDate: "Scheduled Arrival: 01 January 2030"
  }
];

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
    { email: process.env.ADMIN_EMAIL || "admin@old-letters.in", role: "SUPER_ADMIN" },
    { email: "lokesh@oldletters.in", role: "POSTMASTER" }
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
    { fullName: "Lokesh", email: "lokesh@oldletters.in", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120" },
    { fullName: "Vasantha", email: "vasantha@correspondence.in", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120" },
    { fullName: "Vijay", email: "vijay.k@techpark.in", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120" },
    { fullName: "Satya", email: "satya.dev@craft.org", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120" },
    { fullName: "Sravani", email: "sravani.rao@letterpost.in", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120" },
    { fullName: "Harshitha", email: "harshitha.v@hyderabad.in", avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120" },
    { fullName: "Sathwik", email: "sathwik.b@bengaluru.in", avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120" },
    { fullName: "Karthik", email: "karthik.m@chennai.in", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120" }
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
        role: u.email === "lokesh@oldletters.in" ? "ADMIN" : "USER",
        emailVerified: true,
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
  const lokeshUser = userMap.get("lokesh@oldletters.in");
  const lokeshId = lokeshUser ? lokeshUser._id : new ObjectId();
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
      senderId: lokeshId,
      letterType: "LOVE",
      templateId: "ivory",
      salutation: "Dearest Vasantha,",
      body: "I am writing this on the quiet veranda in Hyderabad as dusk descends. I chose the 48-hour post because some words deserve the quiet patience of waiting.",
      signoff: "Yours in patience,",
      status: "DELIVERED",
      deliveryDate: past1Hour,
      trackingCode: "OL-1892-A",
      recipientVerificationMethod: "open",
      postmarkCity: "Hyderabad Bureau",
      waitingHours: 48,
      attachments: [],
      postedAt: past49Hours,
      deliveredAt: past1Hour,
      createdAt: past49Hours,
      updatedAt: past1Hour
    });
    await recipientsColl.insertOne({
      letterId,
      email: "vasantha@correspondence.in",
      displayName: "Vasantha",
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
      metadata: { city: "Hyderabad Bureau" },
      createdAt: past49Hours
    });
    await deliveryEventsColl.insertOne({
      letterId,
      eventType: "LETTER_DELIVERED",
      metadata: { recipient: "vasantha@correspondence.in" },
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
  return `http://localhost:${PORT}`;
};
var APP_URL = getProductionAppUrl();
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  const forwardedUri = req.headers["x-forwarded-uri"] || req.headers["x-matched-path"] || req.headers["x-invoke-path"];
  if (forwardedUri && forwardedUri.startsWith("/api") && !req.url.startsWith("/api")) {
    req.url = forwardedUri;
  }
  next();
});
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
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
    sameSite: "lax",
    maxAge: 30 * 24 * 3600 * 1e3,
    path: "/"
  });
  res.cookie("oldletters_logged_in", "1", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    maxAge: 30 * 24 * 3600 * 1e3,
    path: "/"
  });
}
function clearSessionCookie(res, req) {
  const secure = getCookieSecurity(req);
  res.clearCookie("oldletters_session", { path: "/", secure, sameSite: "lax" });
  res.clearCookie("oldletters_logged_in", { path: "/", secure, sameSite: "lax" });
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
    req.user = decoded;
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
  const adminSecretHeader = req.headers["x-admin-secret"];
  if (adminSecretHeader && adminSecretHeader === process.env.ADMIN_SECRET) {
    return true;
  }
  if (req.user && req.user.email) {
    if (req.user.role === "ADMIN" || req.user.email === adminEmail || req.user.email === "lokesh@oldletters.in") {
      return true;
    }
    const db = await getDb();
    const adminColl = db.collection("adminUsers");
    const adminRec = await adminColl.findOne({ email: req.user.email });
    if (adminRec) {
      return true;
    }
  }
  const isDev = !isProd;
  const adminParam = req.query.admin === "true" || req.headers["x-bureau-admin"] === "true";
  if (isDev && adminParam) {
    return true;
  }
  return false;
}
var requireAdmin = async (req, res, next) => {
  const isAdmin = await verifyAdminServerSide(req);
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Unauthorized: Bureau administrative privileges required."
    });
  }
  next();
};
var rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(key, maxRequests = 5, windowMs = 15 * 60 * 1e3) {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
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
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) {
              return done(new Error("No email found in Google profile"), void 0);
            }
            const db = await getDb();
            const usersColl = db.collection("users");
            const now = /* @__PURE__ */ new Date();
            let user = await usersColl.findOne({ googleId: profile.id });
            if (user) {
              await usersColl.updateOne(
                { _id: user._id },
                { $set: { lastLoginAt: now, updatedAt: now } }
              );
              return done(null, {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                role: user.role || "USER",
                authProvider: user.authProvider || "GOOGLE",
                emailVerified: true
              });
            }
            user = await usersColl.findOne({ email });
            if (user) {
              await usersColl.updateOne(
                { _id: user._id },
                {
                  $set: {
                    googleId: profile.id,
                    authProvider: "BOTH",
                    emailVerified: true,
                    lastLoginAt: now,
                    updatedAt: now,
                    avatarUrl: user.avatarUrl || profile.photos?.[0]?.value
                  }
                }
              );
              return done(null, {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                role: user.role || "USER",
                authProvider: "BOTH",
                emailVerified: true
              });
            }
            const newUserId = new ObjectId();
            const newUser = {
              _id: newUserId,
              email,
              fullName: profile.displayName || email.split("@")[0],
              avatarUrl: profile.photos?.[0]?.value,
              authProvider: "GOOGLE",
              googleId: profile.id,
              role: email === adminEmail || email === "lokesh@oldletters.in" ? "ADMIN" : "USER",
              emailVerified: true,
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
          role: req.user.role || (req.user.email === adminEmail || req.user.email === "lokesh@oldletters.in" ? "ADMIN" : "USER"),
          authProvider: req.user.authProvider || "GOOGLE",
          emailVerified: req.user.emailVerified ?? true,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now
        };
        await usersColl.insertOne(restoredUser);
        userDoc = restoredUser;
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
  const resolvedUser = {
    id: userDoc?._id ? userDoc._id.toString() : req.user.id,
    email: userDoc?.email || req.user.email,
    fullName: userDoc?.fullName || req.user.fullName || req.user.email?.split("@")[0] || "Correspondent",
    avatarUrl: userDoc?.avatarUrl || req.user.avatarUrl,
    role: userDoc?.role || req.user.role || (req.user.email === adminEmail || req.user.email === "lokesh@oldletters.in" ? "ADMIN" : "USER"),
    authProvider: userDoc?.authProvider || req.user.authProvider || "GOOGLE",
    emailVerified: userDoc?.emailVerified ?? req.user.emailVerified ?? true,
    googleLinked: !!userDoc?.googleId || req.user.authProvider === "GOOGLE" || req.user.authProvider === "BOTH",
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
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email address is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }
    if (!checkRateLimit(`register:${email}`, 6, 15 * 60 * 1e3)) {
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
              updatedAt: now,
              lastLoginAt: now
            }
          }
        );
        const userPayload2 = {
          id: existing._id.toString(),
          email: existing.email,
          fullName: existing.fullName || fullName,
          role: existing.role || "USER",
          authProvider: "BOTH",
          emailVerified: true
        };
        const sessionToken2 = jwt.sign(userPayload2, JWT_SECRET, { expiresIn: "30d" });
        setSessionCookie(res, req, sessionToken2);
        return res.json({ success: true, token: sessionToken2, user: userPayload2 });
      }
      return res.status(400).json({ success: false, error: "An account with this email already exists." });
    }
    const newUserId = new ObjectId();
    const newUser = {
      _id: newUserId,
      fullName,
      email,
      passwordHash,
      authProvider: "EMAIL",
      role: email === adminEmail || email === "lokesh@oldletters.in" ? "ADMIN" : "USER",
      emailVerified: false,
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
      emailVerified: false
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
    if (!checkRateLimit(`login:${email}`, 10, 15 * 60 * 1e3)) {
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
    await usersColl.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });
    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role || "USER",
      authProvider: user.authProvider || "EMAIL",
      emailVerified: user.emailVerified ?? false
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
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
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
    if (err || !user) {
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
      emailVerified: true
    };
    const userParam = encodeURIComponent(JSON.stringify(safeUser));
    res.redirect(`/?auth=google_success&u=${userParam}`);
  })(req, res, next);
});
app.post("/api/auth/google/test-login", async (req, res) => {
  try {
    const { email, googleId, fullName, avatarUrl } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ success: false, error: "Email and googleId required for verification." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();
    const usersColl = db.collection("users");
    const now = /* @__PURE__ */ new Date();
    let user = await usersColl.findOne({ googleId });
    if (user) {
      await usersColl.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });
    } else {
      user = await usersColl.findOne({ email: cleanEmail });
      if (user) {
        await usersColl.updateOne(
          { _id: user._id },
          {
            $set: {
              googleId,
              authProvider: "BOTH",
              emailVerified: true,
              lastLoginAt: now,
              updatedAt: now
            }
          }
        );
        user = await usersColl.findOne({ _id: user._id });
      } else {
        const newUserId = new ObjectId();
        await usersColl.insertOne({
          _id: newUserId,
          email: cleanEmail,
          fullName: fullName || cleanEmail.split("@")[0],
          avatarUrl,
          authProvider: "GOOGLE",
          googleId,
          role: cleanEmail === adminEmail || cleanEmail === "lokesh@oldletters.in" ? "ADMIN" : "USER",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now
        });
        user = await usersColl.findOne({ _id: newUserId });
      }
    }
    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role || "USER",
      authProvider: user.authProvider,
      emailVerified: user.emailVerified
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
app.post("/api/auth/request-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address required." });
    }
    if (!checkRateLimit(`auth_otp:${email}`, 5, 15 * 60 * 1e3)) {
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
    res.json({
      success: true,
      message: "Access code sent to email.",
      devOtpHint: isEmailConfigured() ? void 0 : otpCode
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
      await usersColl.insertOne({
        _id: newUserId,
        fullName: defaultName,
        email,
        authProvider: "EMAIL",
        role: email === adminEmail || email === "lokesh@oldletters.in" ? "ADMIN" : "USER",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      });
      user = await usersColl.findOne({ _id: newUserId });
    }
    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role || "USER",
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
  const recipient = await recipientsColl.findOne({ letterId: ltr._id });
  return {
    id: ltr._id.toString(),
    trackingCode: ltr.trackingCode,
    type: ltr.letterType,
    templateId: ltr.templateId,
    senderName: ltr.senderName || reqUser?.fullName || "Correspondent",
    senderEmail: ltr.senderEmail || reqUser?.email || "correspondent@oldletters.in",
    recipientName: ltr.recipientName || recipient?.displayName || "Recipient",
    recipientEmail: ltr.recipientEmail || recipient?.email || "recipient@correspondence.in",
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
    waitingHours: ltr.waitingHours || 48,
    status: ltr.status,
    postmarkCity: ltr.postmarkCity || "Hyderabad Bureau"
  };
}
app.get(["/api/letters", "/api/archive"], requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection("letters");
    const senderId = req.user.id;
    const query = {
      $or: [
        { senderId },
        { senderId: new ObjectId(senderId) }
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
app.post("/api/letters", requireAuth, async (req, res) => {
  try {
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
    const letterId = new ObjectId();
    const now = /* @__PURE__ */ new Date();
    const deliveryDate = new Date(input.scheduledDeliveryAt);
    const senderId = req.user.id;
    const senderEmail = (req.user?.email || input.senderEmail).toLowerCase();
    const senderName = input.senderName || req.user?.fullName || "Correspondent";
    const recipientEmail = input.recipientEmail.trim().toLowerCase();
    const recipientName = input.recipientName.trim();
    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: "Recipient email address is required." });
    }
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
      postmarkCity: input.postmarkCity || "Hyderabad Bureau",
      waitingHours: input.waitingHours,
      attachments: req.body.attachments || [],
      postedAt: now,
      createdAt: now,
      updatedAt: now
    });
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
        dispatchRef: trackingCode,
        status: senderMailRes.success ? "SENT" : "FAILED",
        error: senderMailRes.error
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
        dispatchRef: trackingCode,
        status: "FAILED",
        error: err.message
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
        dispatchRef: trackingCode,
        status: recipientMailRes.success ? "SENT" : "FAILED",
        error: recipientMailRes.error
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
        dispatchRef: trackingCode,
        status: "FAILED",
        error: err.message
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
      postmarkCity: input.postmarkCity || "Hyderabad Bureau"
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
    const isOwner = letter.senderId?.toString() === req.user.id;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied to this correspondence." });
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
  let tokenRec = await tokensColl.findOne({
    tokenHash,
    expiresAt: { $gte: /* @__PURE__ */ new Date() }
  });
  let letter = null;
  if (tokenRec) {
    letter = await lettersColl.findOne({ _id: new ObjectId(tokenRec.letterId) });
  } else {
    tokenRec = await tokensColl.findOne({
      $or: [{ tokenHash: cleanToken }, { rawToken: cleanToken }],
      expiresAt: { $gte: /* @__PURE__ */ new Date() }
    });
    if (tokenRec) {
      letter = await lettersColl.findOne({ _id: new ObjectId(tokenRec.letterId) });
    } else {
      const letterByCode = await lettersColl.findOne({ trackingCode: cleanToken });
      if (letterByCode) {
        letter = letterByCode;
        tokenRec = await tokensColl.findOne({ letterId: letterByCode._id });
      }
    }
  }
  if (!letter) return null;
  const recipient = await recipientsColl.findOne({ letterId: letter._id });
  return { letter, tokenRec, recipient, tokenHash };
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
    const now = /* @__PURE__ */ new Date();
    const deliveryDate = new Date(letter.deliveryDate || letter.createdAt);
    const isArrived = now.getTime() >= deliveryDate.getTime();
    const remainingMs = Math.max(0, deliveryDate.getTime() - now.getTime());
    const remainingSeconds = Math.ceil(remainingMs / 1e3);
    const remainingHours = Math.ceil(remainingMs / (1e3 * 60 * 60));
    if (isArrived && letter.status === "SCHEDULED") {
      await lettersColl.updateOne(
        { _id: letter._id, status: "SCHEDULED" },
        { $set: { status: "DELIVERED", deliveredAt: now, updatedAt: now } }
      );
      letter.status = "DELIVERED";
    }
    const rawEmail = recipient?.email || "";
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
          recipientName: recipient?.displayName || "Recipient",
          recipientEmailMasked: maskedEmail,
          verificationMethod,
          status: "IN TRANSIT",
          isDelivered: false,
          isArrived: false,
          canUnseal: false,
          deliveryDate: deliveryDate.toISOString(),
          scheduledDeliveryAt: deliveryDate.toISOString(),
          waitingHours: letter.waitingHours || 48,
          remainingMs,
          remainingSeconds,
          remainingHours,
          templateId: letter.templateId || "ivory",
          postmarkCity: letter.postmarkCity || "Hyderabad Bureau"
        }
      });
    }
    if (isVerifiedSession) {
      const paidList = await (await paidFeaturesColl.find({
        letterId: letter._id.toString(),
        status: "UNLOCKED"
      })).toArray();
      return res.json({
        success: true,
        isSealed: false,
        isArrived: true,
        canUnseal: true,
        isVerified: true,
        metadata: {
          trackingCode: letter.trackingCode,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || "Recipient",
          recipientEmailMasked: maskedEmail,
          verificationMethod,
          status: letter.status,
          isDelivered: true,
          isArrived: true,
          canUnseal: true,
          deliveryDate: deliveryDate.toISOString(),
          scheduledDeliveryAt: deliveryDate.toISOString(),
          waitingHours: letter.waitingHours || 48,
          remainingMs: 0,
          remainingSeconds: 0,
          remainingHours: 0,
          templateId: letter.templateId || "ivory",
          postmarkCity: letter.postmarkCity || "Hyderabad Bureau"
        },
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          type: letter.letterType,
          templateId: letter.templateId,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || "Recipient",
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
        recipientName: recipient?.displayName || "Recipient",
        recipientEmailMasked: maskedEmail,
        verificationMethod,
        status: letter.status,
        isDelivered: true,
        isArrived: true,
        canUnseal: true,
        deliveryDate: deliveryDate.toISOString(),
        scheduledDeliveryAt: deliveryDate.toISOString(),
        waitingHours: letter.waitingHours || 48,
        remainingMs: 0,
        remainingSeconds: 0,
        remainingHours: 0,
        templateId: letter.templateId || "ivory",
        postmarkCity: letter.postmarkCity || "Hyderabad Bureau"
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
    const now = /* @__PURE__ */ new Date();
    const deliveryDate = new Date(letter.deliveryDate || letter.createdAt);
    const isArrived = now.getTime() >= deliveryDate.getTime();
    const remainingMs = Math.max(0, deliveryDate.getTime() - now.getTime());
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
    if (!checkRateLimit(`recipient_otp:${letter._id.toString()}`, 5, 15 * 60 * 1e3)) {
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
    res.json({
      success: true,
      message: "Verification code dispatched to recipient email.",
      devOtpHint: isEmailConfigured() ? void 0 : otpCode
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/delivery/verify", "/api/delivery/verify-otp", "/api/recipient/verify", "/api/recipient/verify-otp", "/api/recipient/passphrase"], async (req, res) => {
  try {
    const parseResult = RecipientVerifySchema.safeParse(req.body);
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
    const now = /* @__PURE__ */ new Date();
    const deliveryDate = new Date(letter.deliveryDate || letter.createdAt);
    const isArrived = now.getTime() >= deliveryDate.getTime();
    const remainingMs = Math.max(0, deliveryDate.getTime() - now.getTime());
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
      return res.json({
        success: true,
        recipientAccessToken,
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          type: letter.letterType,
          templateId: letter.templateId,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || "Recipient",
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
    const deliveryDate = new Date(letter.deliveryDate || letter.scheduledDeliveryAt || letter.createdAt);
    const postedAt = new Date(letter.postedAt || letter.createdAt);
    const elapsedMs = now.getTime() - postedAt.getTime();
    const msUntilArrival = deliveryDate.getTime() - now.getTime();
    if (elapsedMs >= 24 * 3600 * 1e3 && now < deliveryDate) {
      const alreadySentHalfway = await eventsColl.findOne({
        letterId: letter._id,
        eventType: "HALFWAY_EMAIL_SENT"
      });
      if (!alreadySentHalfway) {
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
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: letter._id,
          eventType: "HALFWAY_EMAIL_SENT",
          createdAt: now
        });
        processed.halfwayCount++;
      }
    }
    if (msUntilArrival <= 30 * 60 * 1e3 && msUntilArrival > 0) {
      const alreadySentPreArrival = await eventsColl.findOne({
        letterId: letter._id,
        eventType: "PRE_ARRIVAL_NOTICE_SENT"
      });
      if (!alreadySentPreArrival) {
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
          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: letter._id,
            eventType: "PRE_ARRIVAL_NOTICE_SENT",
            createdAt: now
          });
          processed.preArrivalCount++;
        }
      }
    }
  }
  const dueLetters = await lettersColl.find({
    status: "SCHEDULED",
    deliveryDate: { $lte: now }
  }).toArray();
  for (const letter of dueLetters) {
    const updated = await lettersColl.findOneAndUpdate(
      { _id: letter._id, status: "SCHEDULED" },
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
      try {
        const arrivalRes = await sendArrivalRecipientEmail({
          recipientEmail,
          recipientName,
          trackingCode: letter.trackingCode,
          arrivalFormatted,
          recipientUrl: deliveryUrl,
          requiresOtp: letter.recipientVerificationMethod === "otp"
        });
        logEmailDispatch({
          type: "RECIPIENT_ARRIVAL",
          to: recipientEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: arrivalRes.success ? "SENT" : "FAILED",
          error: arrivalRes.error
        });
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: letter._id,
          eventType: "RECIPIENT_ARRIVAL_EMAIL_SENT",
          metadata: { recipientEmail },
          createdAt: now
        });
      } catch (err) {
        logEmailDispatch({
          type: "RECIPIENT_ARRIVAL",
          to: recipientEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: "FAILED",
          error: err.message
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
  return processed;
}
app.all(["/api/scheduler/tick", "/api/cron/delivery", "/api/internal/delivery/run"], async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const incomingAuth = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
    const cronHeader = req.headers["x-cron-secret"]?.trim();
    const querySecret = req.query.secret?.trim();
    if (process.env.CRON_SECRET) {
      const authorized = incomingAuth === CRON_SECRET || cronHeader === CRON_SECRET || querySecret === CRON_SECRET;
      if (!authorized) {
        const isAdmin = await verifyAdminServerSide(req);
        if (!isAdmin && process.env.NODE_ENV === "production") {
          return res.status(401).json({ success: false, error: "Unauthorized cron dispatch." });
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
app.post(["/api/payments", "/api/payments/create"], requireAuth, async (req, res) => {
  try {
    const parseResult = SubmitPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((e) => e.message).join(", ")
      });
    }
    const input = parseResult.data;
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const paidFeaturesColl = db.collection("paidFeatures");
    const eventsColl = db.collection("deliveryEvents");
    const paymentId = new ObjectId();
    const now = /* @__PURE__ */ new Date();
    const userId = req.user.id;
    const paymentRecord = {
      _id: paymentId,
      userId,
      letterId: input.letterId || void 0,
      featureCode: input.featureCode,
      amount: input.amount,
      currency: "INR",
      upiReference: input.upiReference,
      paymentScreenshotId: input.screenshotUrl || void 0,
      status: "PENDING",
      // NEVER automatically approved!
      createdAt: now,
      updatedAt: now
    };
    await paymentsColl.insertOne(paymentRecord);
    const paidFeatureId = new ObjectId();
    await paidFeaturesColl.insertOne({
      _id: paidFeatureId,
      userId,
      letterId: input.letterId || "unassigned",
      featureCode: input.featureCode,
      paymentId: paymentId.toString(),
      status: "PENDING",
      createdAt: now
    });
    if (input.letterId) {
      try {
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: new ObjectId(input.letterId),
          eventType: "PAYMENT_CREATED",
          metadata: { amount: input.amount, upiReference: input.upiReference },
          createdAt: now
        });
      } catch {
      }
    }
    res.status(201).json({
      success: true,
      payment: {
        id: paymentId.toString(),
        userId,
        letterId: input.letterId,
        featureCode: input.featureCode,
        amount: input.amount,
        currency: "INR",
        upiReference: input.upiReference,
        status: "PENDING",
        createdAt: now.toISOString()
      },
      message: "UPI payment submitted. Awaiting administrative verification."
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/payments", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const userId = req.user.id;
    const list = await (await paymentsColl.find({ userId })).sort({ createdAt: -1 }).toArray();
    res.json({
      success: true,
      payments: list.map((p) => ({
        id: p._id.toString(),
        featureCode: p.featureCode,
        amount: p.amount,
        status: p.status,
        upiReference: p.upiReference,
        createdAt: p.createdAt.toISOString()
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/admin/payments", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection("payments");
    const list = await (await paymentsColl.find({})).sort({ createdAt: -1 }).toArray();
    res.json({
      success: true,
      payments: list.map((p) => ({
        id: p._id.toString(),
        userId: p.userId?.toString(),
        letterId: p.letterId?.toString(),
        featureCode: p.featureCode,
        amount: p.amount,
        currency: p.currency,
        upiReference: p.upiReference,
        paymentScreenshotPath: p.paymentScreenshotId,
        status: p.status,
        adminNote: p.adminNote,
        verifiedBy: p.verifiedBy,
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : p.createdAt.toISOString()
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/admin/payments/:id/verify", "/api/admin/payments/:id/approve", "/api/admin/payments/:id/reject"], requireAdmin, async (req, res) => {
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
    const paidFeaturesColl = db.collection("paidFeatures");
    const auditColl = db.collection("auditLogs");
    const eventsColl = db.collection("deliveryEvents");
    let payment = null;
    try {
      payment = await paymentsColl.findOne({ _id: new ObjectId(paymentId) });
    } catch {
      payment = await paymentsColl.findOne({ upiReference: paymentId });
    }
    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment record not found" });
    }
    const now = /* @__PURE__ */ new Date();
    const adminIdentifier = req.user?.email || adminEmail;
    await paymentsColl.updateOne(
      { _id: payment._id },
      {
        $set: {
          status,
          adminNote: adminNote || null,
          verifiedBy: adminIdentifier,
          verifiedAt: now,
          updatedAt: now
        }
      }
    );
    if (status === "APPROVED") {
      await paidFeaturesColl.updateOne(
        { paymentId: payment._id.toString() },
        {
          $set: {
            status: "UNLOCKED",
            unlockedAt: now
          }
        }
      );
      await auditColl.insertOne({
        _id: new ObjectId(),
        action: "PAYMENT_APPROVED",
        adminId: adminIdentifier,
        paymentId: payment._id.toString(),
        entityType: "PAYMENT",
        entityId: payment._id.toString(),
        timestamp: now,
        metadata: {
          featureCode: payment.featureCode,
          amount: payment.amount,
          upiReference: payment.upiReference
        }
      });
      if (payment.letterId) {
        try {
          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: new ObjectId(payment.letterId),
            eventType: "PAYMENT_APPROVED",
            metadata: { featureCode: payment.featureCode },
            createdAt: now
          });
        } catch {
        }
      }
    } else if (status === "REJECTED") {
      await paidFeaturesColl.updateOne(
        { paymentId: payment._id.toString() },
        {
          $set: {
            status: "CANCELLED"
          }
        }
      );
      await auditColl.insertOne({
        _id: new ObjectId(),
        action: "PAYMENT_REJECTED",
        adminId: adminIdentifier,
        paymentId: payment._id.toString(),
        entityType: "PAYMENT",
        entityId: payment._id.toString(),
        timestamp: now,
        metadata: { adminNote }
      });
    }
    res.json({
      success: true,
      message: `Payment marked as ${status}.`
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
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Postal API endpoint not found: ${req.method} ${req.path}`
  });
});
app.use((err, req, res, next) => {
  console.error("[OLD-LETTERS API Error]", err);
  if (req.path.startsWith("/api")) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "An unexpected postal bureau error occurred."
    });
  }
  next(err);
});
async function startServer() {
  try {
    await setupDatabaseIndexes();
    await seedDatabase();
  } catch (seedErr) {
    console.warn("[OLD-LETTERS] Seeding notice:", seedErr);
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
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OLD-LETTERS] Bureau server active on port ${PORT}`);
  });
  setInterval(async () => {
    try {
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
  runDeliveryScheduler
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OLD-LETTERS Central Mailroom Service
 * Gmail SMTP Transactional Email Dispatcher via Nodemailer
 */
