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
    console.warn('[OLD-LETTERS Mailroom] Notice: Gmail SMTP credentials (SMTP_PASS) not configured. Email dispatch skipped.');
    return {
      success: false,
      error: 'Gmail SMTP credentials not configured in environment variables.',
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
