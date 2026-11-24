import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { complaintSchema } from '@/lib/validation';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, PRIORITIES } from '@/lib/constants';
import { Complaint } from '@/lib/models';
import { scoped, studentOf } from '@/lib/services/scope';
import { notify } from '@/lib/services/notify';
import { wardenUserIds } from '@/lib/services/recipients';
import { and, dateRange, enumParam, idParam, qp, roleScopedFilter, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const filter: Record<string, any> = scoped(auth);
  const status = enumParam(req, 'status', COMPLAINT_STATUSES);
  const category = enumParam(req, 'category', COMPLAINT_CATEGORIES);
  const priority = enumParam(req, 'priority', PRIORITIES);
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostel = hostel;
  const student = idParam(req, 'student');
  if (student && auth.role !== 'STUDENT') filter.student = student;
  const f = await roleScopedFilter(auth, filter);
  return paginate(Complaint, and(f, dateRange(req, 'createdAt'), searchFilter(qp(req, 'q'), ['title', 'description'])), req, {
    sort: { createdAt: -1 },
    populate: [{ path: 'student', select: 'name email' }, { path: 'hostel', select: 'name code' }, { path: 'assignedTo', select: 'name' }],
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['STUDENT']);
  const body = await parseBody(req, complaintSchema);
  const me = await studentOf(auth);
  if (!me.hostel) throw new ApiError(409, 'You need an allocated hostel room to raise a complaint');
  const c: any = await Complaint.create({
    ...body,
    organization: auth.organizationId,
    student: me._id,
    hostel: me.hostel,
    status: 'SUBMITTED',
    history: [{ status: 'SUBMITTED', note: 'Complaint submitted', by: auth.userId, at: new Date() }],
  });
  await notify(auth.organizationId, await wardenUserIds(auth.organizationId, me.hostel), {
    type: 'COMPLAINT',
    title: `New ${body.priority.toLowerCase()} priority complaint`,
    message: `${me.name}: ${body.title}`,
    link: '/warden/complaints',
  });
  await audit(auth, 'CREATE', 'Complaint', c._id, { category: body.category }, req);
  return ok(c, { status: 201 });
});
