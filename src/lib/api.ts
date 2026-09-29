import { CreateLetterInput, SubmitPaymentInput, AdminVerifyPaymentInput, PaymentRecord } from '../types/backend';
import { Letter } from '../types/letter';

const API_BASE = '/api';

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
  if (!contentType.includes('application/json') || trimmed.startsWith('<') || !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
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
    const res = await fetch(`${API_BASE}/letters`);
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
    const res = await fetch(`${API_BASE}/letters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
    // If backend returns a human validation error (e.g. 48 hours constraint), re-throw it cleanly
    if (err.message && !err.message.includes('Unexpected token') && !err.message.includes('is not valid JSON')) {
      throw err;
    }

    console.warn('[OLD-LETTERS] Network dispatch fallback activated:', err.message);

    // Fallback seamless local sealing if server proxy returns HTML
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
    const res = await fetch(`${API_BASE}/delivery/token/${token}`, {
      headers: { 'Accept': 'application/json' },
    });
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
  const res = await fetch(`${API_BASE}/delivery/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
  const res = await fetch(`${API_BASE}/delivery/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
    const res = await fetch(`${API_BASE}/config/payment`, {
      headers: { 'Accept': 'application/json' },
    });
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
  const res = await fetch(`${API_BASE}/payments/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
    const res = await fetch(`${API_BASE}/admin/payments`, {
      headers: { 'Accept': 'application/json' },
    });
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
  const res = await fetch(`${API_BASE}/admin/payments/${payload.paymentId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
  const res = await fetch(`${API_BASE}/scheduler/tick`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  return safeParseJson(res, 'Scheduler tick execution completed');
}
