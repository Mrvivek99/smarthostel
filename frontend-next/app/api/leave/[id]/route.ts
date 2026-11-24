import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { leaveReviewSchema } from '@/lib/validation';
import { LeaveRequest, Student } from '@/lib/models';
import { notify } from '@/lib/services/notify';
import { assertRecordAccess, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const l = await findInOrg(LeaveRequest, auth, params.id, 'Leave request');
  await assertRecordAccess(auth, l);
  await l.populate([{ path: 'student', select: 'name email enrollmentNo' }, { path: 'hostel', select: 'name code' }, { path: 'reviewedBy', select: 'name' }]);
  return ok(l);
});

/** Wardens/admins approve or reject pending requests; students may cancel their own (pending, or approved but not yet started). */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const body = await parseBody(req, leaveReviewSchema);
  const l = await findInOrg(LeaveRequest, auth, params.id, 'Leave request');
  await assertRecordAccess(auth, l);

  if (auth.role === 'STUDENT') {
    if (body.status !== 'CANCELLED') throw new ApiError(403, 'Students can only cancel their own leave requests');
    const started = l.status === 'APPROVED' && l.departureDate.getTime() <= Date.now();
    if (!(l.status === 'PENDING' || (l.status === 'APPROVED' && !started))) throw new ApiError(409, `A ${started ? 'started' : l.status.toLowerCase()} leave request cannot be cancelled`);
  } else {
    if (body.status === 'CANCELLED') throw new ApiError(403, 'Only the student can cancel a leave request');
    if (l.status !== 'PENDING') throw new ApiError(409, `Leave request is already ${l.status.toLowerCase()}`);
  }
  const prev = l.status;
  l.status = body.status;
  if (body.remarks !== undefined) l.remarks = body.remarks;
  if (auth.role !== 'STUDENT') {
    l.reviewedBy = auth.userId;
    l.reviewedAt = new Date();
    const s: any = await Student.findById(l.student).select('user').lean();
    await notify(auth.organizationId, [s?.user], { type: 'LEAVE', title: `Leave ${body.status.toLowerCase()}`, message: body.remarks ? `Remarks: ${body.remarks}` : 'Your leave request was reviewed.', link: '/student/leave' });
  }
  await l.save();
  await audit(auth, body.status === 'APPROVED' ? 'APPROVE' : body.status === 'REJECTED' ? 'REJECT' : 'CANCEL', 'LeaveRequest', l._id, { from: prev, remarks: body.remarks }, req);
  return ok(l);
});
