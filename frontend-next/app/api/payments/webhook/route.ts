import { NextRequest } from 'next/server';
import { handler, ok, fail } from '@/lib/api';
import { Payment } from '@/lib/models';
import { applyRefund, markPaymentPaid } from '@/lib/services/payments';
import { verifyWebhookSignature } from '@/lib/services/paymentSignature';
import { toPaise } from '@/lib/services/feeMath';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook. Authenticity comes only from X-Razorpay-Signature over the RAW request body,
 * so the body is read as text before any JSON parsing. Duplicate deliveries are harmless
 * (markPaymentPaid / applyRefund are idempotent). Always answers 200 for events we deliberately ignore
 * so Razorpay does not retry them; infrastructure errors surface as 5xx so they are retried.
 */
export const POST = handler(async (req: NextRequest) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return fail('Webhook is not configured', 503);
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'), secret)) return fail('Invalid signature', 400);

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return fail('Invalid payload', 400);
  }
  const type: string = event?.event;
  const pay = event?.payload?.payment?.entity;
  const order = event?.payload?.order?.entity;

  if (type === 'payment.captured' || type === 'order.paid') {
    const orderId: string | undefined = pay?.order_id ?? order?.id;
    const paymentId: string | undefined = pay?.id;
    if (!orderId || !paymentId) return ok({ ignored: 'missing ids' });
    const payment: any = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) return ok({ ignored: 'unknown order' });
    if (pay?.amount !== undefined && toPaise(payment.amount) !== Number(pay.amount)) {
      console.error('[webhook] amount mismatch for order', orderId);
      await audit({ userId: undefined as any, role: undefined as any, organizationId: String(payment.organization) }, 'WEBHOOK_AMOUNT_MISMATCH', 'Payment', payment._id, { orderId, paymentId });
      return ok({ ignored: 'amount mismatch' });
    }
    if (payment.status === 'CREATED' || (payment.status === 'PAID' && payment.razorpayPaymentId === paymentId)) {
      const r = await markPaymentPaid({ paymentId: String(payment._id), razorpayPaymentId: paymentId, method: pay?.method, source: 'WEBHOOK' });
      if (!r.alreadyProcessed) await audit({ userId: undefined as any, role: undefined as any, organizationId: String(payment.organization) }, 'PAYMENT_PAID', 'Payment', payment._id, { amount: payment.amount, source: 'WEBHOOK' });
    }
    return ok({ processed: true });
  }

  if (type === 'payment.failed') {
    const orderId: string | undefined = pay?.order_id;
    if (orderId) {
      // Status stays CREATED: Razorpay lets the customer retry within the same order.
      await Payment.updateOne({ razorpayOrderId: orderId, status: 'CREATED' }, { failureReason: String(pay?.error_description ?? pay?.error_reason ?? 'Payment failed').slice(0, 300) });
    }
    return ok({ processed: true });
  }

  if (type === 'refund.processed' || type === 'refund.created') {
    const refund = event?.payload?.refund?.entity;
    const razorpayPaymentId: string | undefined = refund?.payment_id ?? pay?.id;
    if (!refund?.id || !razorpayPaymentId) return ok({ ignored: 'missing ids' });
    const payment: any = await Payment.findOne({ razorpayPaymentId });
    if (!payment) return ok({ ignored: 'unknown payment' });
    // Refunds issued through our own API are recorded immediately by refundPayment(); applyRefund is keyed by refund id so this is a no-op then.
    const applied = await applyRefund({ paymentId: String(payment._id), refundId: refund.id, amount: Number(refund.amount) / 100, reason: 'Refund processed by gateway' });
    return ok({ processed: Boolean(applied) });
  }

  return ok({ ignored: type ?? 'unknown' });
});
