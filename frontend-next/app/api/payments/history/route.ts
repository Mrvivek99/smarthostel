import { handler, ok, getPaging } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { PAYMENT_STATUSES } from '@/lib/constants';
import { Payment } from '@/lib/models';
import { scoped, studentOf } from '@/lib/services/scope';
import { castFilter } from '@/lib/services/query';
import { and, csvResponse, dateRange, enumParam, idParam, qp } from '@/lib/crud';

/** Transaction history. Abandoned (CREATED) orders are hidden unless asked for with ?status=CREATED. */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'STUDENT']);
  const { page, limit, skip } = getPaging(req, 20, 200);
  const filter: Record<string, any> = scoped(auth);
  const status = enumParam(req, 'status', PAYMENT_STATUSES);
  filter.status = status ?? { $ne: 'CREATED' };
  if (auth.role === 'STUDENT') filter.student = (await studentOf(auth))._id;
  else {
    const student = idParam(req, 'student');
    if (student) filter.student = student;
  }
  const fee = idParam(req, 'fee');
  if (fee) filter.fee = fee;
  const f = and(filter, dateRange(req, 'createdAt'));

  if (auth.role === 'ADMIN' && qp(req, 'format') === 'csv') {
    const rows: any[] = await Payment.find(f).sort({ createdAt: -1 }).limit(50000).populate('student', 'name email').populate('fee', 'title').lean();
    return csvResponse(
      'payments.csv',
      [
        { key: 'receiptNumber', label: 'Receipt' }, { key: 'student', label: 'Student' }, { key: 'email', label: 'Email' }, { key: 'fee', label: 'Fee' },
        { key: 'amount', label: 'Amount' }, { key: 'refundedAmount', label: 'Refunded' }, { key: 'status', label: 'Status' }, { key: 'method', label: 'Method' },
        { key: 'razorpayPaymentId', label: 'Razorpay Payment' }, { key: 'paidAt', label: 'Paid At' },
      ],
      rows.map((r) => ({ ...r, student: r.student?.name, email: r.student?.email, fee: r.fee?.title }))
    );
  }
  const [items, total, agg] = await Promise.all([
    Payment.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('student', 'name email enrollmentNo').populate('fee', 'title period').lean(),
    Payment.countDocuments(f),
    Payment.aggregate([{ $match: castFilter(Payment, f) }, { $group: { _id: null, paid: { $sum: { $cond: [{ $in: ['$status', ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']] }, '$amount', 0] } }, refunded: { $sum: '$refundedAmount' } } }]),
  ]);
  return ok(items, { meta: { page, limit, total, totalPaid: agg[0]?.paid ?? 0, totalRefunded: agg[0]?.refunded ?? 0 } });
});
