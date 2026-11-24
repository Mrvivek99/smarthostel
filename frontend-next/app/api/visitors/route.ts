import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { visitorSchema } from '@/lib/validation';
import { VERIFICATION_STATUSES } from '@/lib/constants';
import { Hostel, Student, Visitor } from '@/lib/models';
import { assertHostelAccess, scoped } from '@/lib/services/scope';
import { and, assertRefs, boolParam, dateRange, enumParam, idParam, qp, roleScopedFilter, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostel = hostel;
  const student = idParam(req, 'student');
  if (student && auth.role !== 'STUDENT') filter.student = student;
  const vs = enumParam(req, 'verificationStatus', VERIFICATION_STATUSES);
  if (vs) filter.verificationStatus = vs;
  if (boolParam(req, 'inside')) filter.exitTime = { $exists: false };
  const f = await roleScopedFilter(auth, filter);
  return paginate(Visitor, and(f, dateRange(req, 'entryTime'), searchFilter(qp(req, 'q'), ['name', 'contact'])), req, {
    sort: { entryTime: -1 },
    populate: [{ path: 'student', select: 'name enrollmentNo' }, { path: 'hostel', select: 'name code' }],
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const body = await parseBody(req, visitorSchema);
  await assertHostelAccess(auth, body.hostel);
  const [, student]: any[] = await assertRefs(auth, [[Hostel, body.hostel, 'Hostel'], [Student, body.student, 'Student']]);
  if (String(student.hostel) !== body.hostel) throw new ApiError(400, 'The student does not live in this hostel');
  const v: any = await Visitor.create({ ...body, organization: auth.organizationId, registeredBy: auth.userId, entryTime: body.entryTime ?? new Date() });
  await audit(auth, 'CREATE', 'Visitor', v._id, { student: body.student, name: body.name }, req);
  return ok(v, { status: 201 });
});
