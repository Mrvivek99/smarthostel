import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { studentCreateSchema } from '@/lib/validation';
import { STUDENT_STATUSES, GENDERS } from '@/lib/constants';
import { Student, User } from '@/lib/models';
import { hashPassword } from '@/lib/auth/password';
import { scoped, hostelScope } from '@/lib/services/scope';
import { assertWithinPlan } from '@/lib/services/subscription';
import { and, boolParam, enumParam, idParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const filter: Record<string, any> = scoped(auth);
  const status = enumParam(req, 'status', STUDENT_STATUSES);
  const gender = enumParam(req, 'gender', GENDERS);
  if (status) filter.status = status;
  if (gender) filter.gender = gender;
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostel = hostel;
  if (boolParam(req, 'unallocated')) filter.hostel = { $exists: false };
  // Wardens only see students placed in their hostels (unallocated students are an admin concern).
  const scopedFilter = auth.role === 'WARDEN' ? await hostelScope(auth, filter) : filter;
  const q = qp(req, 'q') ?? qp(req, 'search');
  return paginate(Student, and(scopedFilter, searchFilter(q, ['name', 'email', 'enrollmentNo', 'phone'])), req, {
    sort: { name: 1 },
    populate: [
      { path: 'hostel', select: 'name code type' },
      { path: 'room', select: 'roomNumber type' },
      { path: 'bed', select: 'bedNumber' },
    ],
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, studentCreateSchema);
  await assertWithinPlan(auth.organizationId, 'students');
  if (await User.exists({ email: body.email })) throw new ApiError(409, 'An account with this email already exists');
  const { password, ...profile } = body;
  const user: any = await User.create({
    organization: auth.organizationId,
    name: body.name,
    email: body.email,
    passwordHash: await hashPassword(password),
    role: 'STUDENT',
    phone: body.phone,
    emailVerified: true,
  });
  let student: any;
  try {
    student = await Student.create({ ...profile, organization: auth.organizationId, user: user._id, status: 'ACTIVE' });
  } catch (e) {
    await User.deleteOne({ _id: user._id });
    throw e;
  }
  await audit(auth, 'CREATE', 'Student', student._id, { email: body.email }, req);
  return ok(student, { status: 201 });
});
