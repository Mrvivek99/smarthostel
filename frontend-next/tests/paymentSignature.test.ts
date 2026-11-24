import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { hmacSha256Hex, verifyCheckoutSignature, verifyWebhookSignature } from '@/lib/services/paymentSignature';

const secret = 'test_secret_123';

describe('verifyCheckoutSignature', () => {
  const sig = crypto.createHmac('sha256', secret).update('order_1|pay_1').digest('hex');
  it('accepts a correct signature', () => expect(verifyCheckoutSignature('order_1', 'pay_1', sig, secret)).toBe(true));
  it('rejects tampered ids, wrong secret and empty values', () => {
    expect(verifyCheckoutSignature('order_2', 'pay_1', sig, secret)).toBe(false);
    expect(verifyCheckoutSignature('order_1', 'pay_2', sig, secret)).toBe(false);
    expect(verifyCheckoutSignature('order_1', 'pay_1', sig, 'other')).toBe(false);
    expect(verifyCheckoutSignature('order_1', 'pay_1', '', secret)).toBe(false);
    expect(verifyCheckoutSignature('order_1', 'pay_1', sig.slice(0, -2), secret)).toBe(false);
    expect(verifyCheckoutSignature('', 'pay_1', sig, secret)).toBe(false);
  });
});

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });
  const sig = hmacSha256Hex(body, secret);
  it('verifies against the exact raw body', () => expect(verifyWebhookSignature(body, sig, secret)).toBe(true));
  it('fails if the body changes even by whitespace', () => {
    expect(verifyWebhookSignature(body + ' ', sig, secret)).toBe(false);
    expect(verifyWebhookSignature(JSON.stringify(JSON.parse(body), null, 2), sig, secret)).toBe(false);
  });
  it('fails on missing signature or secret', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(body, sig, '')).toBe(false);
  });
});
