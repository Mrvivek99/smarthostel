import { handler, ok } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { Organization, Payment } from '@/lib/models';
import { assertRecordAccess, findInOrg } from '@/lib/crud';

/** Payment detail / receipt data (student: own payments only). */
export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'STUDENT']);
  const p = await findInOrg(Payment, auth, params.id, 'Payment');
  await assertRecordAccess(auth, p, { hostelField: null });
  await p.populate([{ path: 'student', select: 'name email enrollmentNo course' }, { path: 'fee', select: 'title period items amount dueDate' }]);
  const org: any = await Organization.findById(auth.organizationId).select('name logoUrl address email phone').lean();
  return ok({ ...p.toObject(), organizationInfo: org, receipt: p.receiptNumber ? { number: p.receiptNumber, issuedAt: p.paidAt } : undefined });
});
