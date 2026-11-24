import { handler, ok, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { createOrderSchema } from '@/lib/validation';
import { studentOf } from '@/lib/services/scope';
import { createPaymentOrder } from '@/lib/services/payments';
import { rateLimit } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

/** Step 1 of checkout: the server creates the Razorpay order for the student's own fee. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['STUDENT']);
  rateLimit(req, 'pay:create-order', 20, 10 * 60 * 1000, auth.userId);
  const body = await parseBody(req, createOrderSchema);
  const me = await studentOf(auth);
  const order = await createPaymentOrder({ orgId: auth.organizationId, studentId: String(me._id), feeId: body.feeId, amount: body.amount });
  await audit(auth, 'CREATE_ORDER', 'Payment', order.paymentId, { fee: body.feeId, orderId: order.orderId }, req);
  return ok({ ...order, prefill: { name: me.name, email: me.email, contact: me.phone } }, { status: 201 });
});
