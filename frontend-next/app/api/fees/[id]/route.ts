import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { feeUpdateSchema } from '@/lib/validation';
import { Payment, StudentFee } from '@/lib/models';
import { presentFee } from '@/lib/services/fees';
import { assertRecordAccess, defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const fee = await findInOrg(StudentFee, auth, params.id, 'Fee');
  await assertRecordAccess(auth, fee);
  await fee.populate('student', 'name email enrollmentNo');
  const payments = await Payment.find({ fee: fee._id, status: { $ne: 'CREATED' } }).sort({ createdAt: -1 }).lean();
  return ok({ ...presentFee(fee.toObject()), payments });
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, feeUpdateSchema);
  const fee = await findInOrg(StudentFee, auth, params.id, 'Fee');
  if (fee.status === 'CANCELLED') throw new ApiError(409, 'Fee is cancelled');
  if (body.status === 'CANCELLED') {
    if (fee.paidAmount > 0) throw new ApiError(409, 'Fee has payments. Refund them before cancelling.');
    if (await Payment.exists({ fee: fee._id, status: 'CREATED', createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) } }))
      throw new ApiError(409, 'A payment is in progress for this fee. Try again in a few minutes.');
  }
  if (fee.status === 'PAID' && (body.dueDate || body.lateFeePerDay !== undefined)) throw new ApiError(409, 'Fee is already paid');
  fee.set(defined(body));
  await fee.save();
  await audit(auth, 'UPDATE', 'StudentFee', fee._id, { fields: Object.keys(body) }, req);
  return ok(presentFee(fee.toObject()));
});
