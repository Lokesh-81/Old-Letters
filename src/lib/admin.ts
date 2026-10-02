/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authorized Administrator Email Allowlist
 * Only verified identities matching these addresses receive ADMIN privileges.
 */
export const ADMIN_EMAILS: readonly string[] = Object.freeze([
  'poosala15@gmail.com',
  'oldletters.mailroom@gmail.com',
]);

/**
 * Public correspondence / support contact email for the mailroom
 */
export const MAILROOM_CONTACT_EMAIL = 'oldletters.mailroom@gmail.com';

/**
 * Validates whether an email address belongs to an authorized Bureau Administrator.
 * Performs strict case-insensitive normalization.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(normalized)) {
    return true;
  }
  // Check optional environment variable if set in server context
  if (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) {
    if (normalized === process.env.ADMIN_EMAIL.trim().toLowerCase()) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes user role string
 */
export function isUserAdminRole(role?: string | null): boolean {
  if (!role || typeof role !== 'string') return false;
  return role.trim().toUpperCase() === 'ADMIN';
}
