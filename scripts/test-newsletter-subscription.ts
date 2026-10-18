/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Newsletter & Postal Dispatch Subscription Test Suite
 * Tests:
 * 1. Schema validation (valid email, invalid email, consent required)
 * 2. Subscription lifecycle (new subscription, duplicate handling, resubscription)
 * 3. Unsubscribe lifecycle (valid token, invalid token, duplicate unsubscribe)
 * 4. GET and POST unsubscribe endpoints
 * 5. Rate limiting on subscription attempts
 * 6. UI label and copy validation (Subscribe label, dispatches explanation, consent checkbox)
 */

process.env.NODE_ENV = 'test';

import http from 'http';
import fs from 'fs';
import path from 'path';
import { NewsletterSubscribeSchema, NewsletterUnsubscribeSchema } from '../src/types/backend';

async function runNewsletterTests() {
  console.log('===============================================================');
  console.log('   OLD-LETTERS NEWSLETTER & DISPATCH SUBSCRIPTION AUDIT SUITE   ');
  console.log('===============================================================');

  // Import app after setting NODE_ENV = 'test'
  const { app } = await import('../server');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`, details || '');
      throw new Error(`Test failed: ${testName}`);
    }
    passedTests++;
    console.log(`✅ PASSED: ${testName}`);
  }

  // --- PART 1: SCHEMA VALIDATION TESTS ---
  console.log('\n--- 1. SCHEMA VALIDATION TESTS ---');

  // Test 1: Valid email with consent = true
  const validSchema = NewsletterSubscribeSchema.safeParse({
    email: 'reader@example.com',
    consent: true,
  });
  assert(validSchema.success === true, 'Valid email and consent=true passes schema');

  // Test 2: Missing consent
  const noConsentSchema = NewsletterSubscribeSchema.safeParse({
    email: 'reader@example.com',
    consent: false,
  });
  assert(noConsentSchema.success === false, 'Subscription without consent is rejected by schema');

  // Test 3: Invalid email format
  const badEmailSchema = NewsletterSubscribeSchema.safeParse({
    email: 'not-an-email',
    consent: true,
  });
  assert(badEmailSchema.success === false, 'Malformed email is rejected by schema');

  // Test 4: Unsubscribe schema
  const validUnsubSchema = NewsletterUnsubscribeSchema.safeParse({
    email: 'reader@example.com',
    token: 'abcd1234efgh5678ijkl9012',
  });
  assert(validUnsubSchema.success === true, 'Valid email and token passes unsubscribe schema');

  // --- PART 2: HTTP ENDPOINTS INTEGRATION TESTS ---
  console.log('\n--- 2. HTTP SERVER INTEGRATION TESTS ---');

  // Start HTTP server on random available port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const postJson = async (endpoint: string, body: any, headers: Record<string, string> = {}) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data, headers: res.headers };
    };

    const getJson = async (endpoint: string, headers: Record<string, string> = {}) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...headers,
        },
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data, headers: res.headers };
    };

    const uniqueId = Date.now();
    const testEmail = `postal.gazette.${uniqueId}@example.com`;

    // Test 5: Rejection when consent is missing
    const resNoConsent = await postJson('/api/newsletter/subscribe', {
      email: testEmail,
      consent: false,
    });
    assert(resNoConsent.status === 400, 'POST /api/newsletter/subscribe without consent returns 400');
    assert(Boolean(resNoConsent.data.error), 'POST /api/newsletter/subscribe without consent returns explicit error message');

    // Test 6: Rejection when email is invalid
    const resBadEmail = await postJson('/api/newsletter/subscribe', {
      email: 'not-valid-email',
      consent: true,
    });
    assert(resBadEmail.status === 400, 'POST /api/newsletter/subscribe with malformed email returns 400');

    // Test 7: Successful subscription with valid email and consent
    const resSub = await postJson('/api/newsletter/subscribe', {
      email: testEmail,
      consent: true,
    });
    assert(resSub.status === 201, 'POST /api/newsletter/subscribe with valid email returns 201 Created');
    assert(resSub.data.success === true, 'Response contains success=true');
    assert(resSub.data.alreadySubscribed === false, 'Response indicates alreadySubscribed=false for new subscriber');

    const unsubToken = resSub.data.devUnsubscribeToken || '';
    assert(Boolean(unsubToken), 'Unsubscribe token is generated for the subscriber');

    // Test 8: Duplicate subscription handling
    const resDup = await postJson('/api/newsletter/subscribe', {
      email: testEmail,
      consent: true,
    });
    assert(resDup.status === 200, 'Duplicate subscription returns HTTP 200 OK without failing');
    assert(resDup.data.alreadySubscribed === true, 'Duplicate subscription returns alreadySubscribed=true');
    assert(resDup.data.message.includes('already subscribed'), 'Duplicate subscription returns friendly informative message');

    // Test 9: Check newsletter status endpoint
    const resStatus = await getJson(`/api/newsletter/status?email=${encodeURIComponent(testEmail)}`);
    assert(resStatus.status === 200, 'GET /api/newsletter/status returns 200 OK');
    assert(resStatus.data.subscribed === true, 'GET /api/newsletter/status reports subscribed=true');

    // Test 10: Unsubscribe with invalid token
    const resBadToken = await postJson('/api/newsletter/unsubscribe', {
      email: testEmail,
      token: 'fake-invalid-token-12345',
    });
    assert(resBadToken.status === 400, 'Unsubscribe with invalid token returns HTTP 400 Bad Request');
    assert(resBadToken.data.error.includes('Invalid or expired'), 'Unsubscribe with invalid token returns clear error');

    // Test 11: Unsubscribe with valid token and email
    const resUnsub = await postJson('/api/newsletter/unsubscribe', {
      email: testEmail,
      token: unsubToken,
    });
    assert(resUnsub.status === 200, 'POST /api/newsletter/unsubscribe with valid token returns HTTP 200 OK');
    assert(resUnsub.data.success === true, 'Unsubscribe response returns success=true');

    // Test 12: Verify status is now unsubscribed
    const resStatusUnsub = await getJson(`/api/newsletter/status?email=${encodeURIComponent(testEmail)}`);
    assert(resStatusUnsub.data.subscribed === false, 'Status reports subscribed=false after unsubscription');
    assert(resStatusUnsub.data.status === 'UNSUBSCRIBED', 'Status reports UNSUBSCRIBED');

    // Test 13: Duplicate unsubscribe handling
    const resDupUnsub = await postJson('/api/newsletter/unsubscribe', {
      email: testEmail,
      token: unsubToken,
    });
    assert(resDupUnsub.status === 200, 'Duplicate unsubscribe returns HTTP 200 OK');
    assert(resDupUnsub.data.alreadyUnsubscribed === true, 'Duplicate unsubscribe returns alreadyUnsubscribed=true');

    // Test 14: Resubscription flow
    const resResub = await postJson('/api/newsletter/subscribe', {
      email: testEmail,
      consent: true,
    });
    assert(resResub.status === 200, 'Resubscribing returns HTTP 200 OK');
    assert(resResub.data.resubscribed === true, 'Resubscribing returns resubscribed=true');
    assert(resResub.data.message.includes('restored') || resResub.data.message.includes('Welcome back'), 'Resubscribing returns welcoming message');

    // Test 15: GET /api/newsletter/unsubscribe with JSON accept header
    const freshToken = resResub.data.devUnsubscribeToken;
    assert(Boolean(freshToken), 'Fresh unsubscribe token generated upon resubscribing');
    const resGetUnsub = await getJson(`/api/newsletter/unsubscribe?token=${freshToken}&email=${encodeURIComponent(testEmail)}`);
    assert(resGetUnsub.status === 200, 'GET /api/newsletter/unsubscribe returns 200 OK');
    assert(resGetUnsub.data.success === true, 'GET /api/newsletter/unsubscribe returns success=true');

    // --- PART 3: RATE LIMITING TESTS ---
    console.log('\n--- 3. RATE LIMITING TESTS ---');
    const rateLimitEmail = `ratelimit.${uniqueId}@example.com`;
    let rateLimited = false;
    for (let i = 0; i < 8; i++) {
      const rlRes = await postJson('/api/newsletter/subscribe', {
        email: `rl_${i}_${rateLimitEmail}`,
        consent: true,
      }, {
        'x-forwarded-for': '203.0.113.195', // simulated client IP
      });
      if (rlRes.status === 429) {
        rateLimited = true;
        assert(rlRes.headers.get('retry-after') !== null, 'Rate limited response contains Retry-After header');
        assert(rlRes.data.error.includes('Too many subscription attempts'), 'Rate limited response has descriptive error');
        break;
      }
    }
    assert(rateLimited === true, 'Rate limiter activates and returns HTTP 429 after exceeding limit');

    // --- PART 4: UI COMPONENT & BRANDING AUDIT ---
    console.log('\n--- 4. UI COMPONENT & BRANDING AUDIT ---');
    const footerFile = fs.readFileSync(path.resolve('src/components/ui/index.tsx'), 'utf-8');

    // Test: Check "Inscribe" replaced by "Subscribe" as default button label
    assert(
      footerFile.includes("subscribeLabel = 'Subscribe'"),
      'Footer23 default subscribeLabel is "Subscribe" (not "Inscribe")'
    );

    // Test: Check short explanation of what emails users will receive
    assert(
      footerFile.includes('Periodic dispatches of slow correspondence') ||
      footerFile.includes('seasonal stationery releases'),
      'Footer displays clear explanation of what emails subscribers receive'
    );

    // Test: Check explicit consent checkbox
    assert(
      footerFile.includes('I agree to receive occasional OLD-LETTERS dispatches'),
      'Footer includes explicit consent checkbox and notice'
    );

    // Test: Check accessible feedback container
    assert(
      footerFile.includes('role="status"') && footerFile.includes('aria-live="polite"'),
      'Footer includes accessible live region (role="status", aria-live="polite")'
    );

    // Test: Unsubscribe component exists and preserves luxury aesthetic
    const unsubFile = fs.readFileSync(path.resolve('src/components/legal/UnsubscribeView.tsx'), 'utf-8');
    assert(
      unsubFile.includes('CENTRAL CORRESPONDENCE BUREAU') && unsubFile.includes('Subscription Management'),
      'UnsubscribeView preserves OLD-LETTERS luxury editorial branding'
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n===============================================================');
  console.log(`   ALL ${passedTests}/${totalTests} NEWSLETTER TESTS PASSED SUCCESSFULLY!    `);
  console.log('===============================================================');
}

runNewsletterTests().catch((err) => {
  console.error('Newsletter test execution error:', err);
  process.exit(1);
});
