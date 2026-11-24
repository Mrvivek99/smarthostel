import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { leaveSchema } from '@/lib/validation';
import { LEAVE_STATUSES } from '@/lib/constants';
import { LeaveRequest } from '@/lib/models';
import { scoped, studentOf } from '@/lib/services/scope';
import { notify } from '@/lib/services/notify';
import { wardenUserIds } from '@/lib/services/recipients';
import { and, dateRange, enumParam, idParam, roleScopedFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const filter: Record<string, any> = scoped(auth);
  const status = enumParam(req, 'status', LEAVE_STATUSES);
  if (status) filter.status = status;
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostel = hostel;
  const student = idParam(req, 'student');
  if (student && auth.role !== 'STUDENT') filter.student = student;
  const f = await roleScopedFilter(auth, filter);
  return paginate(LeaveRequest, and(f, dateRange(req, 'departureDate')), req, {
    sort: { createdAt: -1 },
    populate: [{ path: 'student', select: 'name email enrollmentNo' }, { path: 'hostel', select: 'name code' }, { path: 'reviewedBy', select: 'name' }],
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['STUDENT']);
  const body = await parseBody(req, leaveSchema);
  const me = await studentOf(auth);
  if (!me.hostel) throw new ApiError(409, 'You need an allocated hostel room to apply for leave');
  if (body.returnDate < body.departureDate) throw new ApiError(400, 'Return date must be on or after the departure date');
  if (body.departureDate.getTime() < Date.now() - 24 * 3600 * 1000) throw new ApiError(400, 'Departure date cannot be in the past');
  const overlap = await LeaveRequest.exists({
    student: me._id,
    status: { $in: ['PENDING', 'APPROVED'] },
    departureDate: { $lte: body.returnDate },
    returnDate: { $gte: body.departureDate },
  });
  if (overlap) throw new ApiError(409, 'You already have a pending or approved leave overlapping these dates');
  const l: any = await LeaveRequest.create({ ...body, organization: auth.organizationId, student: me._id, hostel: me.hostel, status: 'PENDING' });
  await notify(auth.organizationId, await wardenUserIds(auth.organizationId, me.hostel), { type: 'LEAVE', title: 'New leave request', message: `${me.name} requested leave: ${body.reason.slice(0, 80)}`, link: '/warden/leave' });
  await audit(auth, 'CREATE', 'LeaveRequest', l._id, undefined, req);
  return ok(l, { status: 201 });
});
