import { handler, ok, parseBody, ApiError, oid } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { userUpdateSchema } from '@/lib/validation';
import { RoomAllocation, Student, User, Warden } from '@/lib/models';
import { defined } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['SUPER_ADMIN', 'ADMIN']);
  const u: any = await User.findOne({ _id: oid(params.id), ...(auth.role === 'ADMIN' ? { organization: auth.organizationId, role: { $ne: 'SUPER_ADMIN' } } : {}) }).lean();
  if (!u) throw new ApiError(404, 'User not found');
  return ok(u);
});

/** Activate/deactivate or rename a user of the caller's organization. */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, userUpdateSchema);
  const u: any = await User.findOne({ _id: oid(params.id), organization: auth.organizationId, role: { $ne: 'SUPER_ADMIN' } });
  if (!u) throw new ApiError(404, 'User not found');
  if (body.isActive === false) {
    if (String(u._id) === auth.userId) throw new ApiError(400, 'You cannot deactivate your own account');
    if (u.role === 'STUDENT') {
      const s: any = await Student.findOne({ user: u._id }).select('_id').lean();
      if (s && (await RoomAllocation.exists({ student: s._id, status: 'ACTIVE' }))) throw new ApiError(409, 'Check the student out of their bed before deactivating');
    }
  }
  u.set(defined(body));
  await u.save();
  const profile = defined({ name: body.name, phone: body.phone });
  if (Object.keys(profile).length) await Promise.all([Student.updateOne({ user: u._id }, profile), Warden.updateOne({ user: u._id }, profile)]);
  if (u.role === 'STUDENT' && body.isActive === false) await Student.updateOne({ user: u._id }, { status: 'INACTIVE' });
  if (u.role === 'STUDENT' && body.isActive === true) await Student.updateOne({ user: u._id, status: 'INACTIVE' }, { status: 'ACTIVE' });
  await audit(auth, 'UPDATE', 'User', u._id, { fields: Object.keys(body) }, req);
  return ok({ _id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive });
});
