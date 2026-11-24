import { handler, ok, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { refundSchema } from '@/lib/validation';
import { refundPayment } from '@/lib/services/payments';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, refundSchema);
  const payment: any = await refundPayment({ orgId: auth.organizationId, paymentId: body.paymentId, amount: body.amount, reason: body.reason, by: auth.userId });
  await audit(auth, 'REFUND', 'Payment', body.paymentId, { amount: body.amount, reason: body.reason }, req);
  return ok(payment);
});
