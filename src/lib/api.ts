import { CreateLetterInput, SubmitPaymentInput, AdminVerifyPaymentInput, PaymentRecord } from '../types/backend';
import { Letter } from '../types/letter';

const API_BASE = '/api';

export async function fetchLetters(): Promise<Letter[]> {
  const res = await fetch(`${API_BASE}/letters`);
  if (!res.ok) {
    throw new Error('Failed to load archive letters');
  }
  const data = await res.json();
  return data.letters || [];
}

export async function postLetter(payload: CreateLetterInput): Promise<{
  letter: Letter;
  trackingCode: string;
  deliveryToken: string;
}> {
  const res = await fetch(`${API_BASE}/letters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to seal and post letter.');
  }

  return {
    letter: data.letter,
    trackingCode: data.trackingCode,
    deliveryToken: data.deliveryToken,
  };
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
  const res = await fetch(`${API_BASE}/delivery/token/${token}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid or expired delivery link.');
  }
  return data.metadata;
}

export async function requestOtp(token: string): Promise<{
  message: string;
  devOtpHint?: string;
}> {
  const res = await fetch(`${API_BASE}/delivery/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to dispatch verification code.');
  }
  return data;
}

export async function verifyRecipientAccess(payload: {
  token: string;
  verificationMethod: 'otp' | 'passphrase' | 'open';
  otp?: string;
  passphrase?: string;
}): Promise<Letter> {
  const res = await fetch(`${API_BASE}/delivery/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Verification rejected.');
  }
  return data.letter;
}

export async function fetchPaymentConfig(): Promise<{
  upiId: string;
  upiDisplayName: string;
  paymentQrUrl: string;
}> {
  const res = await fetch(`${API_BASE}/config/payment`);
  return res.json();
}

export async function submitUpiPayment(payload: SubmitPaymentInput): Promise<{
  payment: PaymentRecord;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit payment reference.');
  }
  return data;
}

export async function fetchAdminPayments(): Promise<PaymentRecord[]> {
  const res = await fetch(`${API_BASE}/admin/payments`);
  const data = await res.json();
  return data.payments || [];
}

export async function verifyAdminPayment(payload: AdminVerifyPaymentInput): Promise<{
  payment: PaymentRecord;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/admin/payments/${payload.paymentId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: payload.status,
      adminNote: payload.adminNote,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update payment status.');
  }
  return data;
}

export async function triggerSchedulerTick(): Promise<{
  deliveredCount: number;
  processed: any[];
}> {
  const res = await fetch(`${API_BASE}/scheduler/tick`, { method: 'POST' });
  return res.json();
}
