import { handler, ok, parseBody, getPaging, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { feeCreateSchema } from '@/lib/validation';
import { FEE_CATEGORIES, FEE_STATUSES } from '@/lib/constants';
import { Student, StudentFee } from '@/lib/models';
import { scoped } from '@/lib/services/scope';
import { castFilter } from '@/lib/services/query';
import { presentFee } from '@/lib/services/fees';
import { notify } from '@/lib/services/notify';
import { and, assertRefs, boolParam, dateRange, enumParam, idParam, qp, roleScopedFilter, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const { page, limit, skip } = getPaging(req, 20, 200);
  const filter: Record<string, any> = scoped(auth);
  const status = enumParam(req, 'status', FEE_STATUSES);
  if (status) filter.status = status;
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostel = hostel;
  const student = idParam(req, 'student');
  if (student && auth.role !== 'STUDENT') filter.student = student;
  const period = qp(req, 'period');
  if (period) filter.period = period;
  if (boolParam(req, 'overdue')) {
    filter.status = { $in: ['PENDING', 'PARTIAL'] };
    filter.dueDate = { $lt: new Date() };
  }
  let f = await roleScopedFilter(auth, filter);
  f = and(f, dateRange(req, 'dueDate'));
  if (auth.role !== 'STUDENT') {
    const q = qp(req, 'q');
    if (q) {
      const ids = await Student.find({ organization: auth.organizationId, ...searchFilter(q, ['name', 'email', 'enrollmentNo']) }).select('_id').limit(200).lean();
      f = and(f, { $or: [{ student: { $in: ids.map((s: any) => s._id) } }, ...(searchFilter(q, ['title'])?.$or ?? [])] });
    }
  }
  const [items, total, totals] = await Promise.all([
    StudentFee.find(f).sort({ dueDate: -1, createdAt: -1 }).skip(skip).limit(limit).populate('student', 'name email enrollmentNo').lean(),
    StudentFee.countDocuments(f),
    StudentFee.aggregate([
      { $match: castFilter(StudentFee, f) },
      { $group: { _id: null, billed: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 0, '$amount'] } }, paid: { $sum: '$paidAmount' } } },
    ]),
  ]);
  const t = totals[0] ?? { billed: 0, paid: 0 };
  return ok(items.map((x: any) => presentFee(x)), { meta: { page, limit, total, billed: t.billed, paid: t.paid } });
});

/** Creates a one-off fee/charge for a single student. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, feeCreateSchema);
  const [student]: any[] = await assertRefs(auth, [[Student, body.student, 'Student']]);
  if (student.status === 'INACTIVE') throw new ApiError(409, 'Student is inactive');
  const fee: any = await StudentFee.create({
    organization: auth.organizationId,
    student: student._id,
    hostel: student.hostel,
    title: body.title,
    period: 'CUSTOM',
    items: [{ category: body.category, label: body.title, amount: body.amount }],
    amount: body.amount,
    dueDate: body.dueDate,
    lateFeePerDay: body.lateFeePerDay,
    allowPartial: body.allowPartial,
    status: 'PENDING',
  });
  await notify(auth.organizationId, [student.user], {
    type: 'FEE',
    title: 'New fee added',
    message: `${body.title}: Rs. ${body.amount} due by ${body.dueDate.toLocaleDateString('en-IN')}.`,
    link: '/student/fees',
  });
  await audit(auth, 'CREATE', 'StudentFee', fee._id, { student: body.student, amount: body.amount }, req);
  return ok(presentFee(fee.toObject()), { status: 201 });
});
