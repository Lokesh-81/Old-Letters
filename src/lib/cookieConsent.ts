/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CookieConsentPreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export const COOKIE_CONSENT_STORAGE_KEY = 'oldletters_cookie_consent';

/**
 * Retrieves stored cookie consent preferences from browser localStorage.
 * Returns null if the user has not yet submitted their choice.
 */
export function getStoredConsent(): CookieConsentPreferences | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && parsed.essential === true) {
      return {
        essential: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
        timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('Unable to read cookie consent from storage', e);
  }
  return null;
}

/**
 * Persists cookie consent preferences into browser localStorage.
 * Strictly maintains essential cookies as true.
 */
export function saveConsent(preferences: {
  analytics?: boolean;
  marketing?: boolean;
}): CookieConsentPreferences {
  const record: CookieConsentPreferences = {
    essential: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    timestamp: new Date().toISOString(),
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
      window.dispatchEvent(
        new CustomEvent('oldletters_cookie_consent_updated', { detail: record })
      );
    }
  } catch (err) {
    console.error('Failed to persist cookie consent in localStorage', err);
  }

  return record;
}

/**
 * Convenience helper to accept all cookies (both essential and optional permissions).
 * Note: OLD-LETTERS does not run advertising or unconsented telemetry scripts.
 */
export function acceptAllCookies(): CookieConsentPreferences {
  return saveConsent({ analytics: true, marketing: false });
}

/**
 * Helper to explicitly reject optional cookies.
 * Essential authentication cookies (oldletters_session) remain active and unimpacted.
 */
export function rejectOptionalCookies(): CookieConsentPreferences {
  return saveConsent({ analytics: false, marketing: false });
}
