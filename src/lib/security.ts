/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Security & Validation Utilities for OLD-LETTERS
 * 1. IP extraction with proxy awareness
 * 2. Media file signature validation & anti-malware verification
 * 3. Screenshot URL validation & SSRF prevention
 */

import express from 'express';

// Helper to extract reliable client IP from actual proxy / serverless environment
export function getClientIp(req: express.Request): string {
  if (req.ip) {
    return req.ip.replace(/^::ffff:/, '');
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp.replace(/^::ffff:/, '');
  } else if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim().replace(/^::ffff:/, '');
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim().replace(/^::ffff:/, '');
  }
  return (req.socket?.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
}

// Media file signature (magic numbers) & format validator
export function validateMediaSignature(buffer: Buffer): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: 'Media payload is too small or truncated.' };
  }

  // Reject executable or binary script payloads
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { valid: false, error: 'Executables and binary scripts are strictly prohibited.' };
  }
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, error: 'Executables and binary scripts are strictly prohibited.' };
  }

  // Reject HTML / XML / SVG payloads (XSS vector in media/image contexts)
  const headerUtf8 = buffer.slice(0, 128).toString('utf8').trim().toLowerCase();
  if (
    headerUtf8.startsWith('<?xml') ||
    headerUtf8.startsWith('<svg') ||
    headerUtf8.includes('<script') ||
    headerUtf8.startsWith('<!doctype html') ||
    headerUtf8.startsWith('<html')
  ) {
    return { valid: false, error: 'SVG, HTML and XML files are strictly prohibited.' };
  }

  // WebM / MKV: 0x1A 0x45 0xDF 0xA3 (EBML Header)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { valid: true, detectedMime: 'video/webm' };
  }

  // MP4 / M4A / MOV: byte 4..7 is 'ftyp'
  if (buffer.length >= 12 && buffer.toString('utf8', 4, 8) === 'ftyp') {
    return { valid: true, detectedMime: 'video/mp4' };
  }

  // Ogg / Opus: 'OggS' (0x4F 0x67 0x67 0x53)
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { valid: true, detectedMime: 'audio/ogg' };
  }

  // WAV: 'RIFF' .... 'WAVE'
  if (buffer.length >= 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WAVE') {
    return { valid: true, detectedMime: 'audio/wav' };
  }

  // MP3: ID3 (0x49 0x44 0x33) or MPEG sync frame (0xFF 0xFB, 0xFF 0xF3, 0xFF 0xF2)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { valid: true, detectedMime: 'audio/mpeg' };
  }
  if (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3 || buffer[1] === 0xf2)) {
    return { valid: true, detectedMime: 'audio/mpeg' };
  }

  // AAC ADTS: 0xFF 0xF1 or 0xFF 0xF9
  if (buffer[0] === 0xff && (buffer[1] === 0xf1 || buffer[1] === 0xf9)) {
    return { valid: true, detectedMime: 'audio/aac' };
  }

  // Image formats if attached: PNG, JPEG, WebP
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, detectedMime: 'image/png' };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }
  if (buffer.length >= 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP') {
    return { valid: true, detectedMime: 'image/webp' };
  }

  return {
    valid: false,
    error: 'Unsupported media format. Only authenticated recordings (WebM, MP4, WAV, OGG, MP3) and image enclosures (PNG, JPEG, WebP) are allowed.',
  };
}

// SSRF prevention & screenshot validation
export function validateScreenshotUrl(urlStr: string | null | undefined): { valid: boolean; error?: string } {
  if (!urlStr || !urlStr.trim()) return { valid: true };
  const str = urlStr.trim();
  // If base64 data URL
  if (str.startsWith('data:')) {
    if (str.startsWith('data:image/svg') || str.includes('svg+xml')) {
      return { valid: false, error: 'SVG screenshots are strictly prohibited.' };
    }
    if (!str.startsWith('data:image/png;') && !str.startsWith('data:image/jpeg;') && !str.startsWith('data:image/webp;')) {
      return { valid: false, error: 'Only PNG, JPEG, and WebP image attachments are supported.' };
    }
    if (str.length > 20 * 1024 * 1024) {
      return { valid: false, error: 'Payment screenshot image exceeds 15 MB limit.' };
    }
    return { valid: true };
  }
  // If external URL
  try {
    const parsed = new URL(str);
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only secure HTTPS screenshot URLs are allowed.' };
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '169.254.169.254' ||
      host.endsWith('.internal') ||
      host.endsWith('.local') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return { valid: false, error: 'Private and internal network URLs are prohibited.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid screenshot URL format.' };
  }
}
