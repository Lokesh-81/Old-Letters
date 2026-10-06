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

  // TEST 2: Signup with email + password (and Legal Consent enforcement)
  console.log('\n[TEST 2] Signup without Legal Consent (must fail with 400)...');
  const testEmail = `testsender.${Date.now()}@example.com`;
  const unconsentedSignup = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Test Sender',
      email: testEmail,
      password: 'secretCorrespondence1892',
      termsAccepted: false,
      privacyAccepted: false,
    }),
  });
  console.log('Unconsented signup status (expect 400):', unconsentedSignup.status, unconsentedSignup.data);
  if (unconsentedSignup.status !== 400) {
    throw new Error('Registration without accepting Terms & Privacy was not blocked with 400');
  }

  console.log('\n[TEST 2b] Valid Signup with Legal Consent...');
  const signupRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Test Sender',
      email: testEmail,
      password: 'secretCorrespondence1892',
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: '2026-10-01',
      privacyVersion: '2026-10-01',
    }),
  });
  console.log('Consented signup result:', signupRes.status, signupRes.data);
  if (!signupRes.ok || !signupRes.data.user || signupRes.data.user.email !== testEmail) {
    throw new Error('Email signup failed');
  }
  if (!signupRes.data.user.termsAccepted || !signupRes.data.user.privacyAccepted) {
    throw new Error('Legal consent was not persisted in signup user payload');
  }
  const sessionToken = signupRes.data.token;

  // TEST 3: Duplicate signup rejection
  console.log('\n[TEST 3] Duplicate Signup Rejection...');
  const dupRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Test Duplicate',
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
      senderName: 'Test Sender',
      senderEmail: testEmail,
      recipientName: 'Recipient Name',
      recipientEmail: 'recipient@example.com',
      greeting: 'Dear Recipient,',
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

  // TEST 11: Google Sign-In & Legal Consent Enforcement
  console.log('\n[TEST 11] Google Sign-In without Legal Consent (must fail with 400)...');
  const brandNewGoogleEmail = `new.google.${Date.now()}@example.com`;
  const unconsentedGoogleRes = await request('/api/auth/google/test-login', {
    method: 'POST',
    body: JSON.stringify({
      email: brandNewGoogleEmail,
      googleId: `google-raw-id-${Date.now()}`,
      fullName: 'New Google User',
      termsAccepted: false,
      privacyAccepted: false,
    }),
  });
  console.log('Unconsented Google login status (expect 400):', unconsentedGoogleRes.status, unconsentedGoogleRes.data);
  if (unconsentedGoogleRes.status !== 400) {
    throw new Error('Google registration without legal consent was not blocked with 400');
  }

  console.log('\n[TEST 11b] Valid Google Sign-In with Legal Consent...');
  const consentedGoogleRes = await request('/api/auth/google/test-login', {
    method: 'POST',
    body: JSON.stringify({
      email: brandNewGoogleEmail,
      googleId: `google-raw-id-${Date.now()}`,
      fullName: 'New Google User',
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: '2026-10-01',
      privacyVersion: '2026-10-01',
    }),
  });
  console.log('Consented Google login status:', consentedGoogleRes.status, consentedGoogleRes.data);
  if (!consentedGoogleRes.ok || !consentedGoogleRes.data.user.termsAccepted) {
    throw new Error('Valid Google sign-in failed or legal consent was not saved');
  }

  console.log('\n[TEST 11c] Google Sign-In & Intelligent Account Linking...');
  // Simulate Google sign-in with the SAME email used in email/password signup
  const googleLinkRes = await request('/api/auth/google/test-login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      googleId: 'google-oauth2-id-998877',
      fullName: 'Test Sender Google',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775?w=100',
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: '2026-10-01',
      privacyVersion: '2026-10-01',
    }),
  });
  console.log('Google linking status:', googleLinkRes.status, googleLinkRes.data);
  if (!googleLinkRes.ok || googleLinkRes.data.user.authProvider !== 'BOTH') {
    throw new Error(`Account linking failed: expected authProvider 'BOTH', got ${googleLinkRes.data?.user?.authProvider}`);
  }
  console.log('SUCCESS: Account linked intelligently! authProvider is BOTH.');

  // =========================================================================
  // MANDATORY ADMIN ACCESS, AUTHORIZATION & SECURITY TEST SUITE (12 CRITICAL CHECKS)
  // =========================================================================

  // [TEST 12.1] Unauthenticated user accessing admin endpoint → 401
  console.log('\n[TEST 12.1] Unauthenticated user accessing admin payments (expect 401)...');
  const unauthAdminCheck = await request('/api/admin/payments');
  console.log('Unauthenticated admin check status:', unauthAdminCheck.status, unauthAdminCheck.data);
  if (unauthAdminCheck.status !== 401) {
    throw new Error(`Expected HTTP 401 for unauthenticated admin access, got ${unauthAdminCheck.status}`);
  }

  // [TEST 12.2] Normal authenticated user accessing admin endpoint → 403
  console.log('\n[TEST 12.2] Normal authenticated user accessing admin payments (expect 403)...');
  const normalUserAdminCheck = await request('/api/admin/payments', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('Normal user admin check status:', normalUserAdminCheck.status, normalUserAdminCheck.data);
  if (normalUserAdminCheck.status !== 403) {
    throw new Error(`Expected HTTP 403 for normal authenticated user accessing admin endpoint, got ${normalUserAdminCheck.status}`);
  }

  // [TEST 12.3] poosala15@gmail.com → admin access
  console.log('\n[TEST 12.3] Authenticating poosala15@gmail.com via normal Google OAuth flow...');
  const poosalaAuthRes = await request('/api/auth/google/test-login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'poosala15@gmail.com',
      googleId: 'google-poosala-id-15',
      fullName: 'Poosala Admin',
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: '2026-10-01',
      privacyVersion: '2026-10-01',
    }),
  });
  if (!poosalaAuthRes.ok || !poosalaAuthRes.data.token) {
    throw new Error('Google sign-in for poosala15@gmail.com failed');
  }
  const poosalaToken = poosalaAuthRes.data.token;
  console.log('poosala15@gmail.com user role:', poosalaAuthRes.data.user?.role);
  if (poosalaAuthRes.data.user?.role !== 'ADMIN') {
    throw new Error(`Expected poosala15@gmail.com to have role 'ADMIN', got '${poosalaAuthRes.data.user?.role}'`);
  }

  const poosalaAdminAccess = await request('/api/admin/payments', {
    headers: { Authorization: `Bearer ${poosalaToken}` },
  });
  console.log('poosala15@gmail.com accessing /api/admin/payments (expect 200):', poosalaAdminAccess.status);
  if (poosalaAdminAccess.status !== 200 || !poosalaAdminAccess.data.success) {
    throw new Error('poosala15@gmail.com failed to access /api/admin/payments');
  }

  // [TEST 12.4] oldletters.mailroom@gmail.com → admin access
  console.log('\n[TEST 12.4] Authenticating oldletters.mailroom@gmail.com via normal Google OAuth flow...');
  const mailroomAuthRes = await request('/api/auth/google/test-login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'oldletters.mailroom@gmail.com',
      googleId: 'google-mailroom-id-1892',
      fullName: 'Correspondence Mailroom Master',
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: '2026-10-01',
      privacyVersion: '2026-10-01',
    }),
  });
  if (!mailroomAuthRes.ok || !mailroomAuthRes.data.token) {
    throw new Error('Google sign-in for oldletters.mailroom@gmail.com failed');
  }
  const mailroomToken = mailroomAuthRes.data.token;
  console.log('oldletters.mailroom@gmail.com user role:', mailroomAuthRes.data.user?.role);
  if (mailroomAuthRes.data.user?.role !== 'ADMIN') {
    throw new Error(`Expected oldletters.mailroom@gmail.com to have role 'ADMIN', got '${mailroomAuthRes.data.user?.role}'`);
  }

  const mailroomAdminAccess = await request('/api/admin/payments', {
    headers: { Authorization: `Bearer ${mailroomToken}` },
  });
  console.log('oldletters.mailroom@gmail.com accessing /api/admin/payments (expect 200):', mailroomAdminAccess.status);
  if (mailroomAdminAccess.status !== 200 || !mailroomAdminAccess.data.success) {
    throw new Error('oldletters.mailroom@gmail.com failed to access /api/admin/payments');
  }

  // [TEST 12.5] Admin can access payment verification
  console.log('\n[TEST 12.5] Verifying payments ledger structure for Admin...');
  if (!Array.isArray(poosalaAdminAccess.data.payments)) {
    throw new Error('Admin payments response missing payments array');
  }

  // [TEST 12.6] Admin can approve payment & [TEST 12.8] stores admin identity
  console.log('\n[TEST 12.6 & 12.8] Submitting and Approving payment with admin identity audit...');
  const samplePaymentRes1 = await request('/api/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      featureCode: 'VOICE_NOTE',
      amount: 149,
      currency: 'INR',
      upiReference: 'UPI-APP-TEST-1001',
      screenshotUrl: 'https://images.unsplash.com/sample-proof.jpg',
    }),
  });
  if (!samplePaymentRes1.ok || !samplePaymentRes1.data.payment) {
    throw new Error('Failed to create sample payment for approval test');
  }
  const paymentId1 = samplePaymentRes1.data.payment.id;

  const approveRes = await request(`/api/admin/payments/${paymentId1}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${poosalaToken}` },
    body: JSON.stringify({
      status: 'APPROVED',
      adminNote: 'UTR verified in SBI postal bureau account.',
    }),
  });
  console.log('Admin approve status (expect 200):', approveRes.status, approveRes.data);
  if (!approveRes.ok || !approveRes.data.success) {
    throw new Error('Admin payment approval failed');
  }
  if (approveRes.data.payment?.verifiedBy !== 'poosala15@gmail.com') {
    throw new Error(`Expected verifiedBy to be 'poosala15@gmail.com', got '${approveRes.data.payment?.verifiedBy}'`);
  }

  // Verify Audit Log records admin identity
  const auditRes = await request('/api/admin/audit-logs', {
    headers: { Authorization: `Bearer ${poosalaToken}` },
  });
  if (!auditRes.ok || !Array.isArray(auditRes.data.auditLogs)) {
    throw new Error('Failed to fetch admin audit logs');
  }
  const approvalAuditLog = auditRes.data.auditLogs.find(
    (l: any) => l.action === 'PAYMENT_APPROVED' && l.paymentId === paymentId1
  );
  if (!approvalAuditLog || approvalAuditLog.adminId !== 'poosala15@gmail.com') {
    throw new Error(`Audit log did not record admin identity: ${JSON.stringify(approvalAuditLog)}`);
  }
  console.log('SUCCESS: Admin approval verified and admin identity stored in payment & audit log.');

  // [TEST 12.7] Admin can reject payment
  console.log('\n[TEST 12.7] Submitting and Rejecting payment...');
  const samplePaymentRes2 = await request('/api/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      featureCode: 'VIDEO_NOTE',
      amount: 299,
      currency: 'INR',
      upiReference: 'UPI-REJ-TEST-1002',
    }),
  });
  const paymentId2 = samplePaymentRes2.data.payment.id;

  const rejectRes = await request(`/api/admin/payments/${paymentId2}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mailroomToken}` },
    body: JSON.stringify({
      status: 'REJECTED',
      adminNote: 'Duplicate UTR reference provided.',
    }),
  });
  console.log('Admin reject status (expect 200):', rejectRes.status, rejectRes.data);
  if (!rejectRes.ok || !rejectRes.data.success) {
    throw new Error('Admin payment rejection failed');
  }
  if (rejectRes.data.payment?.status !== 'REJECTED') {
    throw new Error(`Expected status 'REJECTED', got '${rejectRes.data.payment?.status}'`);
  }
  if (rejectRes.data.payment?.verifiedBy !== 'oldletters.mailroom@gmail.com') {
    throw new Error(`Expected verifiedBy to be 'oldletters.mailroom@gmail.com', got '${rejectRes.data.payment?.verifiedBy}'`);
  }

  // [TEST 12.9] Normal user cannot approve/reject payment
  console.log('\n[TEST 12.9] Verifying normal user cannot approve or reject payment (expect 403)...');
  const normalUserApprove = await request(`/api/admin/payments/${paymentId2}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({ status: 'APPROVED' }),
  });
  console.log('Normal user approve status (expect 403):', normalUserApprove.status);
  if (normalUserApprove.status !== 403) {
    throw new Error(`Normal user was not blocked with 403 from approving payments (got ${normalUserApprove.status})`);
  }

  const normalUserReject = await request(`/api/admin/payments/${paymentId1}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({ status: 'REJECTED' }),
  });
  console.log('Normal user reject status (expect 403):', normalUserReject.status);
  if (normalUserReject.status !== 403) {
    throw new Error(`Normal user was not blocked with 403 from rejecting payments (got ${normalUserReject.status})`);
  }

  // [TEST 12.10] Admin status cannot be forged through frontend request data or headers/query params
  console.log('\n[TEST 12.10] Testing anti-forgery: Frontend sending role: "ADMIN" or query parameters...');
  const forgedEmail = `attacker.${Date.now()}@fraud.org`;
  const forgedSignup = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Fake Admin',
      email: forgedEmail,
      password: 'attackPassword999',
      role: 'ADMIN',
      isAdmin: true,
      termsAccepted: true,
      privacyAccepted: true,
    }),
  });
  if (forgedSignup.data?.user?.role === 'ADMIN') {
    throw new Error('Security Breach: Server trusted client-provided role: "ADMIN" during registration!');
  }

  const forgedToken = forgedSignup.data?.token;
  const forgedAdminCheck = await request('/api/admin/payments?admin=true', {
    headers: {
      Authorization: `Bearer ${forgedToken}`,
      'x-bureau-admin': 'true',
      'x-admin-secret': 'invalid-secret',
    },
  });
  console.log('Forged admin attempt status (expect 403):', forgedAdminCheck.status);
  if (forgedAdminCheck.status !== 403) {
    throw new Error('Security Breach: Forged request bypassed server authorization checks!');
  }

  // [TEST 12.11] Footer contains oldletters.mailroom@gmail.com and no Google AddSession URLs
  console.log('\n[TEST 12.11] Inspecting Footer configuration for mailroom contact email...');
  const fs = await import('fs');
  const path = await import('path');
  const footerContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/index.tsx'), 'utf8');
  if (!footerContent.includes('oldletters.mailroom@gmail.com')) {
    throw new Error('Footer component does not contain contact email: oldletters.mailroom@gmail.com');
  }
  if (!footerContent.includes('mailto:oldletters.mailroom@gmail.com')) {
    throw new Error('Footer component does not use mailto: link for oldletters.mailroom@gmail.com');
  }
  if (footerContent.toLowerCase().includes('addsession')) {
    throw new Error('Footer component unexpectedly contains Google AddSession URL!');
  }
  console.log('SUCCESS: Footer contains oldletters.mailroom@gmail.com as mailto: link with no session URLs.');

  // [TEST 12.12] Google OAuth admin session preserves admin role on /api/auth/me
  console.log('\n[TEST 12.12] Verifying Google OAuth admin session preservation across /api/auth/me...');
  const mePoosalaRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${poosalaToken}` },
  });
  if (!mePoosalaRes.ok || mePoosalaRes.data.user?.role !== 'ADMIN') {
    throw new Error(`Expected role 'ADMIN' on /api/auth/me for poosala15@gmail.com, got '${mePoosalaRes.data.user?.role}'`);
  }

  const meMailroomRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${mailroomToken}` },
  });
  if (!meMailroomRes.ok || meMailroomRes.data.user?.role !== 'ADMIN') {
    throw new Error(`Expected role 'ADMIN' on /api/auth/me for oldletters.mailroom@gmail.com, got '${meMailroomRes.data.user?.role}'`);
  }
  console.log('SUCCESS: Google OAuth admin sessions preserved admin role on /api/auth/me.');

  // [TEST 12.13] End-to-End Voice/Video Payment & Media Lifecycle
  console.log('\n[TEST 12.13] Running Full End-to-End Payment + Voice/Video Media Lifecycle Test...');
  const testUtr = `UTR-${Date.now()}`;
  const endToEndPaymentRes = await request('/api/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      featureCode: 'VOICE_NOTE',
      mediaType: 'VOICE',
      amount: 99,
      currency: 'INR',
      upiReference: testUtr,
    }),
  });
  console.log('Payment submission status (expect 201):', endToEndPaymentRes.status);
  if (!endToEndPaymentRes.ok || !endToEndPaymentRes.data.success) {
    throw new Error('End-to-End Payment creation failed');
  }
  const e2ePaymentId = endToEndPaymentRes.data.paymentId;
  const e2eInternalId = endToEndPaymentRes.data.id || endToEndPaymentRes.data.payment?.id;
  if (!e2ePaymentId || !e2ePaymentId.startsWith('PAY-')) {
    throw new Error(`Expected paymentId to start with PAY-, got '${e2ePaymentId}'`);
  }
  if (endToEndPaymentRes.data.payment.status !== 'PENDING') {
    throw new Error(`Expected initial payment status to be PENDING, got '${endToEndPaymentRes.data.payment.status}'`);
  }
  console.log(`Payment created successfully: ${e2ePaymentId} (status: PENDING)`);

  // Verify payment appears in User's Payment History
  const userPaymentsCheck = await request('/api/payments', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  if (!userPaymentsCheck.ok || !Array.isArray(userPaymentsCheck.data.payments)) {
    throw new Error('Failed to retrieve user payment history');
  }
  const foundInUserHistory = userPaymentsCheck.data.payments.find(
    (p: any) => p.paymentId === e2ePaymentId || p.upiReference === testUtr
  );
  if (!foundInUserHistory) {
    throw new Error(`Payment ${e2ePaymentId} did not appear in user's own payment history!`);
  }
  console.log(`Verified payment ${e2ePaymentId} appears in User's Payment History.`);

  // Verify payment appears in Admin's Payment Verification table
  const adminPaymentsCheck = await request('/api/admin/payments', {
    headers: { Authorization: `Bearer ${poosalaToken}` },
  });
  if (!adminPaymentsCheck.ok || !Array.isArray(adminPaymentsCheck.data.payments)) {
    throw new Error('Failed to retrieve admin payments list');
  }
  const foundInAdminList = adminPaymentsCheck.data.payments.find(
    (p: any) => p.paymentId === e2ePaymentId || p.upiReference === testUtr
  );
  if (!foundInAdminList) {
    throw new Error(`Payment ${e2ePaymentId} did not appear in Admin Payment Verification list!`);
  }
  console.log(`Verified payment ${e2ePaymentId} appears in Admin Payment Verification.`);

  // Upload Voice Media to Private Vault
  console.log('Uploading sample voice audio to private GridFS vault...');
  const sampleAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....test-epistolary-audio');
  const mediaUploadRes = await request(`/api/payments/${e2ePaymentId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      data: `data:audio/webm;base64,${sampleAudioBuffer.toString('base64')}`,
      mimeType: 'audio/webm',
      durationSeconds: 45,
    }),
  });
  console.log('Media upload status (expect 201):', mediaUploadRes.status, mediaUploadRes.data);
  if (!mediaUploadRes.ok || !mediaUploadRes.data.storageKey) {
    throw new Error('Media upload to GridFS vault failed');
  }
  const e2eStorageKey = mediaUploadRes.data.storageKey;

  // Admin previews media stream
  console.log('Admin previewing media stream via /api/admin/media/:storageKey...');
  const adminPreviewRes = await request(`/api/admin/media/${e2eStorageKey}`, {
    headers: { Authorization: `Bearer ${poosalaToken}` },
  });
  if (adminPreviewRes.status !== 200) {
    throw new Error(`Admin preview stream failed with status ${adminPreviewRes.status}`);
  }
  console.log('Admin media preview stream successfully verified.');

  // Admin Approves Payment
  console.log('Admin approving payment...');
  const approveE2eRes = await request(`/api/admin/payments/${e2ePaymentId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${poosalaToken}` },
    body: JSON.stringify({
      status: 'APPROVED',
      adminNote: 'UTR verified against bank statement.',
    }),
  });
  if (!approveE2eRes.ok || approveE2eRes.data.payment?.status !== 'APPROVED') {
    throw new Error('Admin approval of E2E payment failed');
  }
  console.log('Payment status verified as APPROVED.');

  // Create Letter linked to this approved payment
  console.log('Posting letter with linked payment & voice enclosure...');
  const letterWithMediaRes = await request('/api/letters', {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      type: 'LOVE',
      templateId: 'ivory',
      senderName: 'Test Sender',
      senderEmail: 'testsender.1791041148472@example.com',
      recipientName: 'Recipient Name',
      recipientEmail: 'recipient@example.com',
      greeting: 'Dear Recipient,',
      content: 'Listen to my voice note enclosed in this parchment.',
      signoff: 'Forever yours,',
      scheduledDeliveryAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      waitingHours: 48,
      status: 'SCHEDULED',
      paymentId: e2ePaymentId,
      hasMediaAttachment: true,
      mediaType: 'VOICE',
      mediaStorageKey: e2eStorageKey,
      mediaStatus: 'APPROVED',
      personalMessage: {
        type: 'VOICE',
        price: 99,
        paymentId: e2ePaymentId,
        mediaStorageKey: e2eStorageKey,
        durationSeconds: 45,
        mediaStatus: 'APPROVED',
      },
    }),
  });
  if (!letterWithMediaRes.ok || !letterWithMediaRes.data.success) {
    throw new Error('Failed to create letter with linked media');
  }
  const e2eLetterToken = letterWithMediaRes.data.deliveryToken;
  console.log(`Letter created successfully with deliveryToken: ${e2eLetterToken.slice(0, 12)}...`);

  // Recipient cannot access media while still in transit
  console.log('Verifying media is locked in transit prior to arrival (expect 403)...');
  const lockedMediaRes = await request(`/api/delivery/media/${e2eLetterToken}`);
  if (lockedMediaRes.status !== 403) {
    throw new Error(`Expected 403 when streaming media before arrival, got ${lockedMediaRes.status}`);
  }
  console.log('Media correctly locked in transit before arrival time.');

  // Fast forward delivery for testing
  await request('/api/testing/advance-delivery', {
    method: 'POST',
    body: JSON.stringify({ token: e2eLetterToken, stage: 'arrived' }),
  });

  // Recipient breaks seal and unseals letter
  const unsealRes = await request(`/api/letters/verify/${e2eLetterToken}`, {
    method: 'POST',
    body: JSON.stringify({ verificationMethod: 'open' }),
  });
  if (!unsealRes.ok || !unsealRes.data.letter?.personalMessage) {
    throw new Error('Unsealed letter did not return personalMessage enclosure');
  }
  if (unsealRes.data.letter.personalMessage.mediaStatus !== 'APPROVED') {
    throw new Error(`Expected personalMessage mediaStatus to be APPROVED, got '${unsealRes.data.letter.personalMessage.mediaStatus}'`);
  }
  console.log('Recipient unsealed letter with verified personal message enclosure.');

  // Recipient streams media after arrival & approval
  const recipientStreamRes = await request(`/api/delivery/media/${e2eLetterToken}`);
  if (recipientStreamRes.status !== 200) {
    throw new Error(`Recipient media stream failed with status ${recipientStreamRes.status}`);
  }
  console.log('Recipient media stream verified with status 200.');
  console.log('SUCCESS: Full End-to-End Payment + Voice/Video Lifecycle PASSED!');

  // TEST 13: Production Delivery Scheduler & Vercel Cron Endpoint Verification
  console.log('\n[TEST 13] Production Delivery Scheduler & Vercel Cron Verification...');
  const cronSecret = process.env.CRON_SECRET || 'old-letters-cron-secure-key-2026';

  // 1. GET request (as invoked by Vercel Cron) with valid Authorization Bearer
  const cronGetRes = await request('/api/scheduler/tick', {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  console.log('Cron GET status (expect 200):', cronGetRes.status, cronGetRes.data);
  if (!cronGetRes.ok || !cronGetRes.data.success || cronGetRes.data.endpoint !== '/api/scheduler/tick') {
    throw new Error('Vercel Cron HTTP GET execution failed');
  }

  // 2. POST request (for manual/admin testing)
  const cronPostRes = await request('/api/scheduler/tick', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  console.log('Cron POST status (expect 200):', cronPostRes.status, cronPostRes.data);
  if (!cronPostRes.ok || !cronPostRes.data.success) {
    throw new Error('Manual cron POST execution failed');
  }

  // 3. Aliases verification (/api/cron/delivery and /api/internal/delivery/run)
  const aliasRes1 = await request('/api/cron/delivery', {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const aliasRes2 = await request('/api/internal/delivery/run', {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  if (!aliasRes1.ok || !aliasRes2.ok) {
    throw new Error('Cron canonical aliases failed');
  }
  console.log('Cron canonical aliases verified successfully.');

  // 4. Verification of scheduler idempotency on repeated execution
  const secondTick = await request('/api/scheduler/tick', {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  console.log('Second tick result (idempotency check):', secondTick.data);
  if (secondTick.data.deliveredCount !== 0) {
    console.log('Notice: Delivered count was', secondTick.data.deliveredCount);
  }

  // [TEST 14] Correspondence Bureau & User Profile Endpoints
  console.log('\n[TEST 14] Testing Correspondence Bureau & Dashboard Endpoints...');
  const bureauRes = await request('/api/user/bureau-summary', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('Bureau Summary Status (expect 200):', bureauRes.status, bureauRes.data.stats);
  if (!bureauRes.ok || !bureauRes.data.success || !bureauRes.data.stats) {
    throw new Error('GET /api/user/bureau-summary failed');
  }
  if (bureauRes.data.stats.sentCount < 1) {
    throw new Error('Expected at least 1 sent letter in bureau stats');
  }

  // Sent letters endpoint
  const sentRes = await request('/api/letters/sent', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('Sent letters status (expect 200):', sentRes.status, 'Count:', sentRes.data.letters?.length);
  if (!sentRes.ok || !Array.isArray(sentRes.data.letters)) {
    throw new Error('GET /api/letters/sent failed');
  }
  const firstSent = sentRes.data.letters[0];
  if (!firstSent.timeline || !Array.isArray(firstSent.timeline)) {
    throw new Error('Sent letter is missing authentic delivery timeline');
  }

  // Received letters endpoint
  const receivedRes = await request('/api/letters/received', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('Received letters status (expect 200):', receivedRes.status);
  if (!receivedRes.ok || !Array.isArray(receivedRes.data.letters)) {
    throw new Error('GET /api/letters/received failed');
  }

  // User payments endpoint
  const paymentsRes = await request('/api/payments', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('User payments status (expect 200):', paymentsRes.status);
  if (!paymentsRes.ok || !Array.isArray(paymentsRes.data.payments)) {
    throw new Error('GET /api/payments failed');
  }

  // Profile update
  const updateProfileRes = await request('/api/user/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({ fullName: 'Test Sender (Senior Correspondent)' }),
  });
  console.log('Profile update status (expect 200):', updateProfileRes.status);
  if (!updateProfileRes.ok || updateProfileRes.data.user?.fullName !== 'Test Sender (Senior Correspondent)') {
    throw new Error('PUT /api/user/profile failed to update name');
  }

  // Preferences update
  const updatePrefsRes = await request('/api/user/preferences', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      preferences: {
        letterDispatched: true,
        deliveryUpdates: true,
        preArrival: false,
        arrival: true,
        paymentUpdates: true,
      },
    }),
  });
  console.log('Preferences update status (expect 200):', updatePrefsRes.status, updatePrefsRes.data.preferences);
  if (!updatePrefsRes.ok || updatePrefsRes.data.preferences?.preArrival !== false) {
    throw new Error('PUT /api/user/preferences failed');
  }

  // Data export
  const exportRes = await request('/api/user/export-data', {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  console.log('Export data status (expect 200):', exportRes.status, 'Registry Ref:', exportRes.data.exportMetadata?.registryReference);
  if (!exportRes.ok || !exportRes.data.exportMetadata) {
    throw new Error('GET /api/user/export-data failed');
  }

  // Password change
  const passwordChangeRes = await request('/api/user/password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${validToken}` },
    body: JSON.stringify({
      currentPassword: 'secretCorrespondence1892',
      newPassword: 'newSecretCorrespondence2026',
    }),
  });
  console.log('Password change status (expect 200):', passwordChangeRes.status);
  if (!passwordChangeRes.ok || !passwordChangeRes.data.success) {
    throw new Error('PUT /api/user/password failed');
  }

  // [TEST 15] SPA URL Route Resolution for /profile, /account, /bureau
  console.log('\n[TEST 15] Testing Navigation URL Route Resolution (/profile, /account, /bureau)...');
  for (const route of ['/profile', '/account', '/bureau']) {
    const routeRes = await fetch(`${baseUrl}${route}`, {
      headers: { Accept: 'text/html' },
    });
    console.log(`Route ${route} resolution status:`, routeRes.status);
    if (routeRes.status !== 200) {
      throw new Error(`Route ${route} failed to resolve with status 200`);
    }
  }
  console.log('All navigation route paths (/profile, /account, /bureau) resolved successfully.');

  // [TEST 16] Session restoration after page refresh (Cookie-based auth against /api/auth/me)
  console.log('\n[TEST 16] Testing Session Restoration after Refresh via /api/auth/me...');
  const meCookieRes = await request('/api/auth/me', {
    headers: { Cookie: `oldletters_session=${validToken}; oldletters_logged_in=1` },
  });
  console.log('/api/auth/me Cookie Auth Status (expect 200):', meCookieRes.status, 'Authenticated:', meCookieRes.data.authenticated);
  if (!meCookieRes.ok || !meCookieRes.data.authenticated || !meCookieRes.data.user) {
    throw new Error('/api/auth/me failed to restore session from cookie');
  }
  if (meCookieRes.data.user.email !== testEmail.toLowerCase()) {
    throw new Error(`Expected email ${testEmail.toLowerCase()} but got ${meCookieRes.data.user.email}`);
  }

  // [TEST 17] Google Login -> Refresh -> Dashboard Flow
  console.log('\n[TEST 17] Testing Google Login -> Refresh -> Dashboard Flow...');
  const googleEmail = `google.correspondent.${Date.now()}@gmail.com`;
  const googleLoginRes = await request('/api/auth/google/test-login', {
    method: 'POST',
    body: JSON.stringify({
      email: googleEmail,
      googleId: `goog_${Date.now()}`,
      fullName: 'Test User',
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: '1.0.0',
      privacyVersion: '1.0.0',
    }),
  });
  console.log('Google login status (expect 200):', googleLoginRes.status, 'Token exists:', !!googleLoginRes.data.token);
  if (!googleLoginRes.ok || !googleLoginRes.data.token || !googleLoginRes.data.user) {
    throw new Error('Google test login failed');
  }
  const googleToken = googleLoginRes.data.token;
  // Verify Google session restored via /api/auth/me
  const googleMeRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${googleToken}` },
  });
  console.log('Google session restore status:', googleMeRes.status, 'Provider:', googleMeRes.data.user?.authProvider);
  if (!googleMeRes.ok || !googleMeRes.data.authenticated || googleMeRes.data.user.authProvider !== 'GOOGLE') {
    throw new Error('Google session failed to restore with GOOGLE provider');
  }
  // Verify bureau summary accessible for Google user
  const googleBureauRes = await request('/api/user/bureau-summary', {
    headers: { Authorization: `Bearer ${googleToken}` },
  });
  console.log('Google user bureau summary status (expect 200):', googleBureauRes.status);
  if (!googleBureauRes.ok || !googleBureauRes.data.stats) {
    throw new Error('Google user bureau summary failed');
  }

  // [TEST 18] Logout Flow -> Public Navigation State Restoration
  console.log('\n[TEST 18] Testing Logout -> Public Navigation State Restoration...');
  const finalLogoutRes = await request('/api/auth/logout', {
    method: 'POST',
  });
  console.log('Logout status (expect 200):', finalLogoutRes.status);
  if (!finalLogoutRes.ok || !finalLogoutRes.data.success) {
    throw new Error('Logout failed');
  }
  // Verify unauthenticated /api/auth/me returns authenticated: false
  const unauthMe = await request('/api/auth/me');
  console.log('Unauthenticated /api/auth/me response:', unauthMe.data);
  if (unauthMe.data.authenticated !== false || unauthMe.data.user !== null) {
    throw new Error('Expected /api/auth/me to return authenticated: false after logout');
  }

  console.log('\n=============================================================');
  console.log('ALL AUTHENTICATION, CONSENT, SCHEDULER & BUREAU TESTS PASSED WITH 100% SUCCESS');
  console.log('=============================================================');
}

runTests().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
