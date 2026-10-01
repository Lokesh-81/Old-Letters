import { CreateLetterInput, SubmitPaymentInput, AdminVerifyPaymentInput, PaymentRecord } from '../types/backend';
import { Letter } from '../types/letter';

const API_BASE = '/api';

/**
 * Normalizes any error, response object, or exception into a clean, human-readable string.
 * Strictly prevents '[object Object]', raw HTML, or unparsed JSON from ever reaching the UI.
 */
export function normalizeApiError(
  err: unknown,
  fallback: string = 'Something went wrong. Please try again.'
): string {
  if (!err) return fallback;

  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (
      !trimmed ||
      trimmed === '[object Object]' ||
      trimmed.toLowerCase().includes('<!doctype') ||
      trimmed.toLowerCase().includes('<html') ||
      trimmed.toLowerCase().includes('<body')
    ) {
      return fallback;
    }
    return trimmed;
  }

  if (err instanceof Error) {
    const msg = typeof err.message === 'string' ? err.message.trim() : '';
    if (
      msg &&
      msg !== '[object Object]' &&
      !msg.toLowerCase().includes('<!doctype') &&
      !msg.toLowerCase().includes('<html')
    ) {
      return msg;
    }
    return fallback;
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, any>;
    if (typeof obj.error === 'string' && obj.error.trim() && obj.error !== '[object Object]') {
      return obj.error.trim();
    }
    if (typeof obj.message === 'string' && obj.message.trim() && obj.message !== '[object Object]') {
      return obj.message.trim();
    }
    if (obj.error && typeof obj.error === 'object') {
      if (typeof obj.error.message === 'string' && obj.error.message.trim()) {
        return obj.error.message.trim();
      }
      if (typeof obj.error.code === 'string' && obj.error.code.trim()) {
        return `Error: ${obj.error.code}`;
      }
    }
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && typeof first.message === 'string' && first.message.trim()) return first.message.trim();
    }
    if (typeof obj.statusText === 'string' && obj.statusText.trim()) {
      return obj.statusText.trim();
    }
  }

  return fallback;
}

/**
 * Core HTTP client guaranteeing credentials: 'include' across all requests.
 * Ensures session cookies are sent for same-origin and cross-origin requests.
 */
export async function apiFetch(endpoint: string, init: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(init.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });
}

/**
 * Safely parse response as JSON. Never blindly call res.json() to prevent
 * syntax errors when server returns HTML error pages or non-JSON strings.
 */
async function safeParseJson<T = any>(res: Response, fallbackMessage: string): Promise<T> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new Error('Unable to read network response from correspondence bureau.');
  }

  const contentType = res.headers.get('content-type') || '';
  const trimmed = text.trim();

  // If response is HTML or plain text error page (starts with <!DOCTYPE, <html, "The page c"...)
  if (!contentType.includes('application/json') || trimmed.startsWith('<') || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('The requested correspondence record could not be found.');
      }
      if (res.status >= 500) {
        throw new Error('The correspondence bureau is currently processing archives. Please try again shortly.');
      }
      throw new Error(`The service returned status ${res.status}. ${fallbackMessage}`);
    }
    throw new Error(fallbackMessage);
  }

  try {
    const data = JSON.parse(text);
    return data as T;
  } catch {
    throw new Error('Received an unreadable response format from the postal service.');
  }
}

export async function fetchLetters(): Promise<Letter[]> {
  try {
    const res = await apiFetch('/letters');
    if (!res.ok) {
      return [];
    }
    const data = await safeParseJson<{ success: boolean; letters: Letter[] }>(
      res,
      'Failed to load archive letters'
    );
    return data.letters || [];
  } catch (err) {
    console.warn('[OLD-LETTERS] Backend letters fetch failed, using local archive:', err);
    return [];
  }
}

export async function postLetter(payload: CreateLetterInput): Promise<{
  letter: Letter;
  trackingCode: string;
  deliveryToken: string;
}> {
  const generatedCode = `OL-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  const localToken = `dt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  try {
    const res = await apiFetch('/letters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await safeParseJson<{
      success: boolean;
      letter: Letter;
      trackingCode: string;
      deliveryToken: string;
      error?: string;
    }>(res, 'Failed to seal and post letter.');

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to seal and post letter.');
    }

    return {
      letter: data.letter,
      trackingCode: data.trackingCode,
      deliveryToken: data.deliveryToken || localToken,
    };
  } catch (err: any) {
    if (err.message && !err.message.includes('Unexpected token') && !err.message.includes('is not valid JSON')) {
      throw err;
    }

    console.warn('[OLD-LETTERS] Network dispatch fallback activated:', err.message);

    const fallbackLetter: Letter = {
      id: `ol-${Date.now()}`,
      trackingCode: generatedCode,
      type: payload.type,
      templateId: payload.templateId,
      senderName: payload.senderName,
      senderEmail: payload.senderEmail,
      recipientName: payload.recipientName,
      recipientEmail: payload.recipientEmail,
      letterDate: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      greeting: payload.greeting,
      content: payload.content,
      signoff: payload.signoff,
      attachments: [],
      verificationMethod: payload.verificationMethod,
      passphrase: payload.passphrase,
      postedAt: new Date().toISOString(),
      scheduledDeliveryAt: payload.scheduledDeliveryAt,
      waitingHours: payload.waitingHours,
      status: 'SCHEDULED',
      postmarkCity: payload.postmarkCity || 'Hyderabad Bureau',
    };

    return {
      letter: fallbackLetter,
      trackingCode: generatedCode,
      deliveryToken: localToken,
    };
  }
}

export async function getDeliveryMeta(token: string): Promise<{
  trackingCode: string;
  senderName: string;
  recipientName: string;
  recipientEmailMasked: string;
  verificationMethod: 'otp' | 'passphrase' | 'open';
  status: string;
  isDelivered: boolean;
  deliveryDate: string;
}> {
  try {
    const res = await apiFetch(`/delivery/token/${token}`);
    const data = await safeParseJson<{
      success: boolean;
      metadata: any;
      error?: string;
    }>(res, 'Invalid or expired delivery link.');

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'The letter link is invalid or has expired.');
    }
    return data.metadata;
  } catch (err: any) {
    if (err.message && !err.message.includes('Unexpected token') && !err.message.includes('is not valid JSON')) {
      throw err;
    }
    throw new Error('This correspondence link could not be verified by the postal bureau.');
  }
}

export async function requestOtp(token: string): Promise<{
  message: string;
  devOtpHint?: string;
}> {
  const res = await apiFetch('/delivery/request-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const data = await safeParseJson<{
    success: boolean;
    message?: string;
    devOtpHint?: string;
    error?: string;
  }>(res, 'Failed to dispatch verification code.');

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Could not send verification code.');
  }
  return {
    message: data.message || 'Verification code dispatched.',
    devOtpHint: data.devOtpHint,
  };
}

export async function verifyRecipientAccess(payload: {
  token: string;
  verificationMethod: 'otp' | 'passphrase' | 'open';
  otp?: string;
  passphrase?: string;
}): Promise<Letter> {
  const res = await apiFetch('/delivery/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await safeParseJson<{
    success: boolean;
    letter?: Letter;
    error?: string;
  }>(res, 'Verification rejected.');

  if (!res.ok || !data.success || !data.letter) {
    throw new Error(data.error || 'The verification code or cipher was incorrect.');
  }
  return data.letter;
}

export async function fetchPaymentConfig(): Promise<{
  upiId: string;
  upiDisplayName: string;
  paymentQrUrl: string;
}> {
  try {
    const res = await apiFetch('/config/payment');
    const data = await safeParseJson<{
      upiId?: string;
      upiDisplayName?: string;
      paymentQrUrl?: string;
    }>(res, 'Could not load payment configuration');
    return {
      upiId: data.upiId || 'oldletters@okhdfcbank',
      upiDisplayName: data.upiDisplayName || 'OLD-LETTERS CORRESPONDENCE',
      paymentQrUrl: data.paymentQrUrl || '/assets/upi-qr.png',
    };
  } catch {
    return {
      upiId: 'oldletters@okhdfcbank',
      upiDisplayName: 'OLD-LETTERS CORRESPONDENCE',
      paymentQrUrl: '/assets/upi-qr.png',
    };
  }
}

export async function submitUpiPayment(payload: SubmitPaymentInput): Promise<{
  payment: PaymentRecord;
  message: string;
}> {
  const res = await apiFetch('/payments/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await safeParseJson<{
    success: boolean;
    payment: PaymentRecord;
    message?: string;
    error?: string;
  }>(res, 'Failed to submit payment reference.');

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit payment reference.');
  }
  return {
    payment: data.payment,
    message: data.message || 'Payment reference submitted.',
  };
}

export async function fetchAdminPayments(): Promise<PaymentRecord[]> {
  try {
    const res = await apiFetch('/admin/payments');
    const data = await safeParseJson<{ payments?: PaymentRecord[] }>(
      res,
      'Failed to load payments'
    );
    return data.payments || [];
  } catch {
    return [];
  }
}

export async function verifyAdminPayment(payload: AdminVerifyPaymentInput): Promise<{
  payment: PaymentRecord;
  message: string;
}> {
  const res = await apiFetch(`/admin/payments/${payload.paymentId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: payload.status,
      adminNote: payload.adminNote,
    }),
  });

  const data = await safeParseJson<{
    success: boolean;
    payment: PaymentRecord;
    message?: string;
    error?: string;
  }>(res, 'Failed to update payment status.');

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update payment status.');
  }
  return {
    payment: data.payment,
    message: data.message || 'Payment status updated.',
  };
}

export async function triggerSchedulerTick(): Promise<{
  deliveredCount: number;
  processed: any[];
}> {
  const res = await apiFetch('/scheduler/tick', {
    method: 'POST',
  });
  return safeParseJson(res, 'Scheduler tick execution completed');
}

export async function requestAuthOtp(email: string): Promise<{
  success: boolean;
  message: string;
  devOtpHint?: string;
}> {
  const res = await apiFetch('/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return safeParseJson(res, 'Failed to request authentication code');
}

export async function verifyAuthOtp(email: string, otp: string, fullName?: string): Promise<{
  success: boolean;
  user: { id: string; email: string; fullName: string };
  token?: string;
}> {
  const res = await apiFetch('/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, fullName }),
  });
  const data = await safeParseJson<{
    success: boolean;
    user: any;
    token?: string;
  }>(res, 'Authentication verification failed');
  if (data.user) {
    try { localStorage.setItem('old_letters_user', JSON.stringify(data.user)); } catch {}
  }
  return data;
}

export async function updateLetter(id: string, updates: Partial<CreateLetterInput>): Promise<Letter> {
  const res = await apiFetch(`/letters/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  const data = await safeParseJson<{ success: boolean; letter: Letter; error?: string }>(
    res,
    'Failed to update correspondence.'
  );

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update correspondence.');
  }

  return data.letter;
}

export async function deleteLetter(id: string): Promise<void> {
  const res = await apiFetch(`/letters/${id}`, {
    method: 'DELETE',
  });

  const data = await safeParseJson<{ success: boolean; error?: string }>(
    res,
    'Failed to remove correspondence.'
  );

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to remove correspondence.');
  }
}

export async function finalizeLetterPost(id: string): Promise<{
  letter: Letter;
  trackingCode: string;
  deliveryToken?: string;
}> {
  const res = await apiFetch(`/letters/${id}/post`, {
    method: 'POST',
  });

  const data = await safeParseJson<{
    success: boolean;
    letter: Letter;
    trackingCode: string;
    deliveryToken?: string;
    error?: string;
  }>(res, 'Failed to seal and dispatch correspondence.');

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to seal and dispatch correspondence.');
  }

  return {
    letter: data.letter,
    trackingCode: data.trackingCode,
    deliveryToken: data.deliveryToken,
  };
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  fullName: string;
  role?: string;
  avatarUrl?: string;
  authProvider?: string;
  emailVerified?: boolean;
  googleLinked?: boolean;
  createdAt?: string;
  lettersCount?: number;
} | null> {
  try {
    const res = await apiFetch('/auth/me');
    if (!res.ok) {
      if (res.status === 401) {
        try { localStorage.removeItem('old_letters_user'); } catch {}
      }
      const cached = localStorage.getItem('old_letters_user');
      return cached ? JSON.parse(cached) : null;
    }
    const data = await safeParseJson<{ authenticated: boolean; user?: any }>(res, 'Failed to get current user');
    if (data.authenticated && data.user) {
      try { localStorage.setItem('old_letters_user', JSON.stringify(data.user)); } catch {}
      return data.user;
    }
    // Only remove local storage if not in middle of google_success redirect
    const isGoogleAuthRedirect = typeof window !== 'undefined' && window.location.search.includes('google_success');
    if (!isGoogleAuthRedirect) {
      try { localStorage.removeItem('old_letters_user'); } catch {}
    } else {
      const cached = localStorage.getItem('old_letters_user');
      if (cached) return JSON.parse(cached);
    }
    return null;
  } catch {
    try {
      const cached = localStorage.getItem('old_letters_user');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    try { localStorage.removeItem('old_letters_user'); } catch {}
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } catch {
    // Silent fail
  }
}

export async function signupUser(payload: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<{ user: any; token?: string }> {
  let res: Response;
  try {
    res = await apiFetch('/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Unable to connect to the correspondence bureau. Please check your network connection.');
  }

  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new Error('Something went wrong. Please try again.');
  }

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok || !data || data.success === false) {
    const errorString = normalizeApiError(
      data?.error || data?.message || data,
      res.status === 400
        ? 'A valid email and password (minimum 6 characters) are required.'
        : res.status === 429
        ? 'Too many registration attempts. Please wait a few minutes.'
        : 'Something went wrong. Please try again.'
    );
    throw new Error(errorString);
  }

  if (!data.user) {
    throw new Error('Something went wrong. Please try again.');
  }

  try {
    localStorage.setItem('old_letters_user', JSON.stringify(data.user));
  } catch {}

  return { user: data.user, token: data.token };
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<{ user: any; token?: string }> {
  let res: Response;
  try {
    res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Unable to connect to the correspondence bureau. Please check your network connection.');
  }

  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new Error('Something went wrong. Please try again.');
  }

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok || !data || data.success === false) {
    const errorString = normalizeApiError(
      data?.error || data?.message || data,
      res.status === 401
        ? 'Invalid email or password.'
        : res.status === 429
        ? 'Too many login attempts. Please wait 15 minutes.'
        : 'Something went wrong. Please try again.'
    );
    throw new Error(errorString);
  }

  if (!data.user) {
    throw new Error('Something went wrong. Please try again.');
  }

  try {
    localStorage.setItem('old_letters_user', JSON.stringify(data.user));
  } catch {}

  return { user: data.user, token: data.token };
}
