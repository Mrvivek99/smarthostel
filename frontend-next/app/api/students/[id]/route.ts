import { handler, ok, parseBody, ApiError, oid } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { studentSelfUpdateSchema, studentUpdateSchema } from '@/lib/validation';
import { RoomAllocation, Student, User, AdmissionApplication } from '@/lib/models';
import { assertHostelAccess, studentOf } from '@/lib/services/scope';
import { defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

async function resolveStudent(auth: Awaited<ReturnType<typeof requireAuth>>, id: string) {
  if (auth.role === 'STUDENT') {
    const me = await studentOf(auth);
    if (id !== 'me' && id !== String(me._id)) throw new ApiError(404, 'Student not found');
    return me;
  }
  const s = await findInOrg(Student, auth, id, 'Student');
  if (auth.role === 'WARDEN') await assertHostelAccess(auth, s.hostel);
  return s;
}

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const s = await resolveStudent(auth, params.id);
  await s.populate([
    { path: 'hostel', select: 'name code type' },
    { path: 'room', select: 'roomNumber type' },
    { path: 'bed', select: 'bedNumber' },
  ]);
  const [allocation, admission] = await Promise.all([
    RoomAllocation.findOne({ student: s._id, status: 'ACTIVE' }).lean(),
    AdmissionApplication.findOne({ student: s._id }).sort({ createdAt: -1 }).select('status remarks createdAt reviewedAt').lean(),
  ]);
  return ok({ ...s.toObject(), activeAllocation: allocation ?? undefined, admission: admission ?? undefined });
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'STUDENT']);
  const s = await resolveStudent(auth, params.id);
  const body: Record<string, any> = auth.role === 'ADMIN' ? await parseBody(req, studentUpdateSchema) : await parseBody(req, studentSelfUpdateSchema);

  if (body.status === 'INACTIVE' || body.isActive === false) {
    if (await RoomAllocation.exists({ student: s._id, status: 'ACTIVE' })) throw new ApiError(409, 'Check the student out of their bed before deactivating');
  }
  const { isActive, ...profile } = body;
  s.set(defined(profile));
  if (isActive === false) s.status = 'INACTIVE';
  if (isActive === true && s.status === 'INACTIVE') s.status = 'ACTIVE';
  await s.save();

  const userSet = defined({ name: body.name, phone: body.phone, avatarUrl: body.avatarUrl, isActive });
  if (Object.keys(userSet).length) await User.updateOne({ _id: s.user }, userSet);
  await audit(auth, 'UPDATE', 'Student', s._id, { fields: Object.keys(body) }, req);
  return ok(s);
});

/** Deactivates (soft delete) so allocation, fee and payment history is preserved. */
export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const s = await findInOrg(Student, auth, oid(params.id), 'Student');
  if (await RoomAllocation.exists({ student: s._id, status: 'ACTIVE' })) throw new ApiError(409, 'Check the student out of their bed before removing them');
  s.status = 'INACTIVE';
  await s.save();
  await User.updateOne({ _id: s.user }, { isActive: false });
  await audit(auth, 'DEACTIVATE', 'Student', s._id, undefined, req);
  return ok({ _id: s._id, status: 'INACTIVE', deactivated: true });
});
