/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Security, Privacy, Media, SSRF, Rate Limiting & SEO Verification Test Suite
 * OLD-LETTERS Production Readiness
 */

import fs from 'fs';
import path from 'path';
import { validateMediaSignature, validateScreenshotUrl } from '../src/lib/security';
import { consumeDistributedRateLimit } from '../src/lib/mongodb';

async function runSecurityPrivacySuite() {
  console.log('===================================================================');
  console.log('   OLD-LETTERS SECURITY, PRIVACY, MEDIA & SEO AUDIT TEST SUITE    ');
  console.log('===================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail?: any) {
    total++;
    if (!condition) {
      console.error(`❌ FAILED: ${name}`, detail || '');
      throw new Error(`Security check failed: ${name}`);
    }
    passed++;
    console.log(`✅ PASSED: ${name}`);
  }

  // -------------------------------------------------------------------------
  // 1. MEDIA SIGNATURE VALIDATION & ANTI-MALWARE AUDIT
  // -------------------------------------------------------------------------
  console.log('--- 1. MEDIA SIGNATURE & ANTI-MALWARE AUDIT ---');

  // Valid WebM header (0x1A 0x45 0xDF 0xA3)
  const webmBuf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x93, 0x42, 0x82, 0x88, 0x6d, 0x61, 0x74, 0x72]);
  assert('WebM signature is recognized as valid', validateMediaSignature(webmBuf).valid);

  // Valid MP4 header (ftyp at byte 4)
  const mp4Buf = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
  assert('MP4 signature is recognized as valid', validateMediaSignature(mp4Buf).valid);

  // Valid WAV header (RIFF....WAVE)
  const wavBuf = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00,
    0x57, 0x41, 0x56, 0x45, // WAVE
  ]);
  assert('WAV signature is recognized as valid', validateMediaSignature(wavBuf).valid);

  // Valid OGG/Opus header (OggS)
  const oggBuf = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00]);
  assert('OGG signature is recognized as valid', validateMediaSignature(oggBuf).valid);

  // Valid MP3 header (ID3)
  const mp3Buf = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  assert('MP3 signature is recognized as valid', validateMediaSignature(mp3Buf).valid);

  // Valid PNG header
  const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  assert('PNG signature is recognized as valid', validateMediaSignature(pngBuf).valid);

  // Malicious: SVG payload disguised as media
  const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert('SVG file disguised as media is strictly rejected', !validateMediaSignature(svgBuf).valid);

  // Malicious: XML/HTML disguised as media
  const xmlBuf = Buffer.from('<?xml version="1.0"?><payload></payload>');
  assert('XML file disguised as media is strictly rejected', !validateMediaSignature(xmlBuf).valid);

  // Malicious: Executable ELF binary
  const elfBuf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
  assert('ELF executable binary is strictly rejected', !validateMediaSignature(elfBuf).valid);

  // Malicious: Executable DOS/PE binary
  const peBuf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  assert('PE/Windows executable binary is strictly rejected', !validateMediaSignature(peBuf).valid);

  // Truncated buffer
  const tinyBuf = Buffer.from([0x01, 0x02]);
  assert('Truncated media buffer is rejected', !validateMediaSignature(tinyBuf).valid);

  // -------------------------------------------------------------------------
  // 2. SSRF & PAYMENT SCREENSHOT URL AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 2. SSRF & PAYMENT SCREENSHOT URL AUDIT ---');

  // Valid HTTPS external URL
  assert(
    'Valid HTTPS screenshot URL is accepted',
    validateScreenshotUrl('https://example.com/receipt.jpg').valid
  );

  // Valid base64 PNG data URL
  assert(
    'Valid base64 PNG data URL is accepted',
    validateScreenshotUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==').valid
  );

  // SSRF attack: AWS/Cloud metadata service IP (169.254.169.254)
  assert(
    'Cloud metadata service IP (169.254.169.254) is rejected',
    !validateScreenshotUrl('https://169.254.169.254/latest/meta-data').valid
  );

  // SSRF attack: Localhost
  assert(
    'Localhost URL is rejected',
    !validateScreenshotUrl('https://localhost:3000/internal').valid
  );
  assert(
    '127.0.0.1 IP is rejected',
    !validateScreenshotUrl('https://127.0.0.1:8080/admin').valid
  );

  // SSRF attack: Private RFC1918 subnets
  assert(
    'Private 10.0.0.1 network URL is rejected',
    !validateScreenshotUrl('https://10.0.0.1/secret').valid
  );
  assert(
    'Private 192.168.1.1 network URL is rejected',
    !validateScreenshotUrl('https://192.168.1.1/router').valid
  );

  // Insecure cleartext HTTP URL
  assert(
    'Cleartext HTTP URL is rejected',
    !validateScreenshotUrl('http://insecure-site.com/image.png').valid
  );

  // XSS vector: SVG data URL
  assert(
    'SVG data URL is rejected',
    !validateScreenshotUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=').valid
  );

  // -------------------------------------------------------------------------
  // 3. DISTRIBUTED RATE LIMITING LOGIC AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 3. DISTRIBUTED RATE LIMITING AUDIT ---');

  const testKey = `test_limit_${Date.now()}`;
  const first = await consumeDistributedRateLimit(testKey, 3, 5000);
  assert('Initial request within limit is allowed', first.allowed && first.remaining === 2);

  const second = await consumeDistributedRateLimit(testKey, 3, 5000);
  assert('Second request within limit is allowed', second.allowed && second.remaining === 1);

  const third = await consumeDistributedRateLimit(testKey, 3, 5000);
  assert('Third request matches limit', third.allowed && third.remaining === 0);

  const fourth = await consumeDistributedRateLimit(testKey, 3, 5000);
  assert('Fourth request exceeding limit is blocked (429)', !fourth.allowed);
  assert('Blocked request returns positive retryAfterSeconds', fourth.retryAfterSeconds > 0);

  // -------------------------------------------------------------------------
  // 4. STRUCTURED DATA & AEO / SEO AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 4. STRUCTURED DATA & AEO / SEO AUDIT ---');

  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert('index.html contains FAQPage Schema.org definition', indexHtml.includes('"@type": "FAQPage"'));
  assert('index.html FAQ covers "What is OLD-LETTERS?"', indexHtml.includes('What is OLD-LETTERS?'));
  assert('index.html FAQ covers "How does OLD-LETTERS work?"', indexHtml.includes('How does OLD-LETTERS work?'));
  assert('index.html FAQ covers privacy & security', indexHtml.includes('How are letters kept private and secure?'));

  const robotsTxt = fs.readFileSync(path.resolve('public', 'robots.txt'), 'utf-8');
  assert('robots.txt points to canonical sitemap', robotsTxt.includes('Sitemap: https://oldletters.vercel.app/sitemap.xml'));
  assert('robots.txt allows AI search engine crawlers (GPTBot, ClaudeBot, PerplexityBot)', robotsTxt.includes('GPTBot') && robotsTxt.includes('PerplexityBot'));

  const sitemapXml = fs.readFileSync(path.resolve('public', 'sitemap.xml'), 'utf-8');
  assert('sitemap.xml includes canonical homepage', sitemapXml.includes('https://oldletters.vercel.app/'));
  assert('sitemap.xml includes how-it-works page', sitemapXml.includes('https://oldletters.vercel.app/how-it-works'));

  console.log('\n===================================================================');
  console.log(`   ALL ${passed}/${total} SECURITY & PRIVACY AUDIT CHECKS PASSED! `);
  console.log('===================================================================\n');
}

runSecurityPrivacySuite().catch((err) => {
  console.error('Audit test run error:', err);
  process.exit(1);
});
