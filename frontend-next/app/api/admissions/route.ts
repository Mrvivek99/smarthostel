import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { admissionSchema } from '@/lib/validation';
import { ADMISSION_STATUSES } from '@/lib/constants';
import { AdmissionApplication, Hostel } from '@/lib/models';
import { scoped, studentOf } from '@/lib/services/scope';
import { notify } from '@/lib/services/notify';
import { adminUserIds } from '@/lib/services/recipients';
import { and, assertRefs, enumParam, idParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'STUDENT']);
  const filter: Record<string, any> = scoped(auth);
  const status = enumParam(req, 'status', ADMISSION_STATUSES);
  if (status) filter.status = status;
  if (auth.role === 'STUDENT') filter.student = (await studentOf(auth))._id;
  else {
    const student = idParam(req, 'student');
    if (student) filter.student = student;
  }
  return paginate(AdmissionApplication, and(filter, searchFilter(qp(req, 'q'), ['fullName', 'phone', 'course', 'enrollmentNo'])), req, {
    sort: { createdAt: -1 },
    populate: [{ path: 'student', select: 'name email status gender' }, { path: 'preferredHostel', select: 'name code type' }],
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['STUDENT']);
  const body = await parseBody(req, admissionSchema);
  const me = await studentOf(auth);
  if (me.status === 'ACTIVE') throw new ApiError(409, 'Your admission is already approved');
  if (await AdmissionApplication.exists({ student: me._id, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }))
    throw new ApiError(409, 'You already have an application under review');
  if (body.preferredHostel) await assertRefs(auth, [[Hostel, body.preferredHostel, 'Preferred hostel', { isActive: true }]]);
  const app: any = await AdmissionApplication.create({ ...body, organization: auth.organizationId, student: me._id, status: 'SUBMITTED' });
  await notify(auth.organizationId, await adminUserIds(auth.organizationId), {
    type: 'ADMISSION',
    title: 'New admission application',
    message: `${body.fullName} submitted a hostel application.`,
    link: '/admissions',
  });
  await audit(auth, 'CREATE', 'AdmissionApplication', app._id, { student: String(me._id) }, req);
  return ok(app, { status: 201 });
});
