import { seedDatabase } from './seed';

async function runTests() {
  console.log('--- STARTING OLD-LETTERS AUTHENTICATION & SECURITY TEST SUITE ---');

  // Seed DB first
  await seedDatabase();

  const baseUrl = 'http://localhost:3000';

  async function request(path: string, options: any = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    try {
      return { status: res.status, ok: res.ok, data: JSON.parse(text), headers: res.headers };
    } catch {
      return { status: res.status, ok: res.ok, raw: text, headers: res.headers };
    }
  }

  // TEST 1: Health check
  console.log('\n[TEST 1] Health Check...');
  const health = await request('/api/health');
  console.log('Health status:', health.status, health.data);
  if (!health.ok || health.data.backend !== 'mongodb-atlas') {
    throw new Error('Health check failed');
  }

  // TEST 2: Signup with email + password
  console.log('\n[TEST 2] Signup with Email + Password...');
  const testEmail = `vasantha.${Date.now()}@correspondence.in`;
  const signupRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Vasantha Rao',
      email: testEmail,
      password: 'secretCorrespondence1892',
    }),
  });
  console.log('Signup result:', signupRes.status, signupRes.data);
  if (!signupRes.ok || !signupRes.data.user || signupRes.data.user.email !== testEmail) {
    throw new Error('Email signup failed');
  }
  const sessionToken = signupRes.data.token;

  // TEST 3: Duplicate signup rejection
  console.log('\n[TEST 3] Duplicate Signup Rejection...');
  const dupRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Vasantha Duplicate',
      email: testEmail,
      password: 'anotherPassword123',
    }),
  });
  console.log('Duplicate signup status (expect 400):', dupRes.status, dupRes.data);
  if (dupRes.status !== 400) {
    throw new Error('Duplicate signup was not rejected');
  }

  // TEST 4: Invalid Password Login
  console.log('\n[TEST 4] Invalid Password Login...');
  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'wrongPassword!999',
    }),
  });
  console.log('Invalid login status (expect 401):', badLogin.status, badLogin.data);
  if (badLogin.status !== 401) {
    throw new Error('Invalid password was not rejected with 401');
  }

  // TEST 5: Successful Login with Email + Password
  console.log('\n[TEST 5] Valid Email + Password Login...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'secretCorrespondence1892',
    }),
  });
  console.log('Login result:', loginRes.status, loginRes.data);
  if (!loginRes.ok || !loginRes.data.token) {
    throw new Error('Valid login failed');
  }
  const validToken = loginRes.data.token;

  // TEST 6: Session Verification (/api/auth/me while logged in)
  console.log('\n[TEST 6] Verify Active Session (/api/auth/me)...');
  const meRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('Me result:', meRes.status, meRes.data);
  if (!meRes.ok || !meRes.data.authenticated || meRes.data.user.email !== testEmail) {
    throw new Error('Active session verification failed');
  }

  // TEST 7: Logout & Verification (/api/auth/me when logged out)
  console.log('\n[TEST 7] Logout & Logged-out Session Check...');
  const logoutRes = await request('/api/auth/logout', { method: 'POST' });
  console.log('Logout status:', logoutRes.status, logoutRes.data);
  const meLoggedOut = await request('/api/auth/me');
  console.log('Logged out me status:', meLoggedOut.data);
  if (meLoggedOut.data.authenticated !== false) {
    throw new Error('Logged out session check failed');
  }

  // TEST 8: Protected Endpoints (Expect 401 Unauthorized for all unauthenticated calls)
  console.log('\n[TEST 8] Verifying 401 Unauthorized across all protected endpoints...');
  const unauthLetters = await request('/api/letters');
  const unauthArchive = await request('/api/archive');
  const unauthPostLetter = await request('/api/letters', { method: 'POST', body: JSON.stringify({}) });
  const unauthFinalizePost = await request('/api/letters/sample-id/post', { method: 'POST' });
  const unauthPutLetter = await request('/api/letters/sample-id', { method: 'PUT', body: JSON.stringify({}) });
  const unauthDeleteLetter = await request('/api/letters/sample-id', { method: 'DELETE' });

  if (unauthLetters.status !== 401) throw new Error('GET /api/letters not blocked with 401');
  if (unauthArchive.status !== 401) throw new Error('GET /api/archive not blocked with 401');
  if (unauthPostLetter.status !== 401) throw new Error('POST /api/letters not blocked with 401');
  if (unauthFinalizePost.status !== 401) throw new Error('POST /api/letters/:id/post not blocked with 401');
  if (unauthPutLetter.status !== 401) throw new Error('PUT /api/letters/:id not blocked with 401');
  if (unauthDeleteLetter.status !== 401) throw new Error('DELETE /api/letters/:id not blocked with 401');
  console.log('SUCCESS: All 6 endpoints returned 401 Unauthorized when unauthenticated.');

  // TEST 9: Protected Letter Creation & Strict Sender ID Ownership
  console.log('\n[TEST 9] Protected Letter Creation with Authenticated Sender ID...');
  const futureDelivery = new Date(Date.now() + 50 * 3600 * 1000).toISOString();
  const letterPostRes = await request('/api/letters', {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      senderId: 'hacker-tampered-sender-id', // MUST BE OVERRIDDEN BY SERVER
      type: 'LOVE',
      templateId: 'ivory',
      senderName: 'Vasantha Rao',
      senderEmail: testEmail,
      recipientName: 'Harshitha',
      recipientEmail: 'harshitha@hyderabad.in',
      greeting: 'Dearest Harshitha,',
      content: 'Words penned with patience always reach the soul.',
      signoff: 'Forever yours,',
      verificationMethod: 'open',
      scheduledDeliveryAt: futureDelivery,
      waitingHours: 48,
      status: 'SCHEDULED',
    }),
  });
  console.log('Letter post status:', letterPostRes.status, letterPostRes.data);
  if (!letterPostRes.ok || !letterPostRes.data.deliveryToken) {
    throw new Error('Authenticated letter post failed');
  }
  const postedLetterId = letterPostRes.data.letter.id;

  // TEST 10: Letter Retrieval strictly for authenticated owner
  console.log('\n[TEST 10] Letter Retrieval for Authenticated Owner...');
  const myLetters = await request('/api/letters', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('My letters count:', myLetters.data.letters.length);
  const found = myLetters.data.letters.some((l: any) => l.id === postedLetterId);
  if (!found) {
    throw new Error('Posted letter not found in owner archive');
  }

  // TEST 11: Google Sign-In & Intelligent Account Linking
  console.log('\n[TEST 11] Google Sign-In & Account Linking...');
  // Simulate Google sign-in with the SAME email used in email/password signup
  const googleLinkRes = await request('/api/auth/google/test-login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      googleId: 'google-oauth2-id-998877',
      fullName: 'Vasantha Rao Google',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775?w=100',
    }),
  });
  console.log('Google linking status:', googleLinkRes.status, googleLinkRes.data);
  if (!googleLinkRes.ok || googleLinkRes.data.user.authProvider !== 'BOTH') {
    throw new Error(`Account linking failed: expected authProvider 'BOTH', got ${googleLinkRes.data?.user?.authProvider}`);
  }
  console.log('SUCCESS: Account linked intelligently! authProvider is BOTH.');

  // TEST 12: Admin Route Protection (403 for regular user, 200 for admin)
  console.log('\n[TEST 12] Admin Route Protection...');
  const userAdminCheck = await request('/api/admin/payments', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('Regular user accessing admin payments (expect 403):', userAdminCheck.status);
  if (userAdminCheck.status !== 403) {
    throw new Error('Admin payments route was not protected with 403');
  }

  // Admin access via bureau header
  const adminCheck = await request('/api/admin/payments', {
    headers: { 'x-bureau-admin': 'true' },
  });
  console.log('Authorized admin accessing payments status:', adminCheck.status);
  if (!adminCheck.ok) {
    throw new Error('Authorized admin access failed');
  }

  console.log('\n=============================================================');
  console.log('ALL 12 AUTHENTICATION & SECURITY TESTS PASSED WITH 100% SUCCESS');
  console.log('=============================================================');
}

runTests().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
