import { ApiError } from '@/lib/api';

const BASE = 'https://api.razorpay.com/v1';

export function razorpayKeyId(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  if (!id) throw new ApiError(503, 'Online payments are not configured on this server');
  return id;
}
export function razorpaySecret(): string {
  const s = process.env.RAZORPAY_KEY_SECRET;
  if (!s) throw new ApiError(503, 'Online payments are not configured on this server');
  return s;
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const auth = Buffer.from(`${razorpayKeyId()}:${razorpaySecret()}`).toString('base64');
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[razorpay] network error', e);
    throw new ApiError(502, 'Could not reach the payment gateway');
  }
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[razorpay] error', res.status, json?.error);
    throw new ApiError(502, `Payment gateway error: ${json?.error?.description ?? res.statusText}`);
  }
  return json as T;
}

export interface RzpOrder { id: string; amount: number; currency: string; status: string }
export interface RzpRefund { id: string; amount: number; payment_id: string; status: string }

export const createRazorpayOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  call<RzpOrder>('/orders', { amount: amountPaise, currency: 'INR', receipt, notes });

export const refundRazorpayPayment = (paymentId: string, amountPaise: number, notes: Record<string, string>) =>
  call<RzpRefund>(`/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, notes });
