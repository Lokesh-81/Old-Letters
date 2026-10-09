/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical Delivery Date & Timing Authority for OLD-LETTERS.
 * Enforces exact Unix millisecond / UTC comparisons and authoritative delivery calculations.
 */

export function parseToMs(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? null : t;
  }
  if (typeof val === 'number' && !isNaN(val)) {
    return val < 1e11 ? val * 1000 : val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return num < 1e11 ? num * 1000 : num;
    }
    const parsed = Date.parse(trimmed);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Resolves delivery timestamp strictly and consistently from:
 * letter.deliveryDate || letter.scheduledDeliveryAt || letter.createdAt
 * Returns both a Date object and exact UTC Unix milliseconds.
 */
export function resolveDeliveryDate(letter: any): { date: Date; ms: number } {
  if (!letter) {
    const now = Date.now();
    return { date: new Date(now), ms: now };
  }

  const candidateMs =
    parseToMs(letter.deliveryDate) ??
    parseToMs(letter.scheduledDeliveryAt) ??
    parseToMs(letter.createdAt) ??
    Date.now();

  return { date: new Date(candidateMs), ms: candidateMs };
}

/**
 * Accurately formats remaining seconds into human-readable digital postal countdown.
 * NEVER displays "0m 0s" prematurely before arrival.
 */
export function formatRemaining(totalSecs: number): string {
  if (totalSecs <= 0) {
    return 'Arriving now';
  }
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Resolves formatted Postal Tempo label reflecting configured waiting duration.
 */
export function getPostalTempoLabel(waitingHours: number): string {
  if (waitingHours === 1) return '1 Hour Sealed';
  if (waitingHours < 24) return `${waitingHours} Hours Sealed`;
  if (waitingHours === 24) return '1 Day Sealed';
  if (waitingHours === 48) return '48 Hours Sealed';
  if (waitingHours === 168) return '7 Days Sealed';
  if (waitingHours === 720) return '30 Days Sealed';
  if (waitingHours % 24 === 0) return `${waitingHours / 24} Days Sealed`;
  return `${waitingHours} Hours Sealed`;
}
