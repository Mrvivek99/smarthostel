import crypto from 'crypto';

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function hmacSha256Hex(payload: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** Razorpay Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  return safeEqualHex(hmacSha256Hex(`${orderId}|${paymentId}`, secret), signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret) compared with X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string | null | undefined, secret: string): boolean {
  if (!rawBody || !signature || !secret) return false;
  return safeEqualHex(hmacSha256Hex(rawBody, secret), signature);
}
