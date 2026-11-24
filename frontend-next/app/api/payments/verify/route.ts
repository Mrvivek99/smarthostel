import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { verifyPaymentSchema } from '@/lib/validation';
import { Payment } from '@/lib/models';
import { studentOf } from '@/lib/services/scope';
import { markPaymentPaid } from '@/lib/services/payments';
import { verifyCheckoutSignature } from '@/lib/services/paymentSignature';
import { razorpaySecret } from '@/lib/services/razorpay';
import { rateLimit } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

/** Step 3: the HMAC signature is verified server-side; the browser's "success" callback alone is never trusted. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['STUDENT']);
  rateLimit(req, 'pay:verify', 30, 10 * 60 * 1000, auth.userId);
  const body = await parseBody(req, verifyPaymentSchema);
  const me = await studentOf(auth);
  const payment: any = await Payment.findOne({ razorpayOrderId: body.razorpay_order_id, organization: auth.organizationId, student: me._id });
  if (!payment) throw new ApiError(404, 'Payment not found');

  if (!verifyCheckoutSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature, razorpaySecret())) {
    await audit(auth, 'VERIFY_FAILED', 'Payment', payment._id, { orderId: body.razorpay_order_id }, req);
    throw new ApiError(400, 'Payment signature verification failed');
  }
  const result = await markPaymentPaid({
    paymentId: String(payment._id),
    razorpayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
    source: 'VERIFY',
  });
  if (!result.alreadyProcessed) await audit(auth, 'PAYMENT_PAID', 'Payment', payment._id, { amount: payment.amount, source: 'VERIFY' }, req);
  const p = result.payment.toObject ? result.payment.toObject() : result.payment;
  delete p.razorpaySignature;
  return ok({ ...p, alreadyProcessed: result.alreadyProcessed });
});
