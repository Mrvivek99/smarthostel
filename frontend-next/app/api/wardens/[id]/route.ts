import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { wardenUpdateSchema } from '@/lib/validation';
import { Hostel, User, Warden } from '@/lib/models';
import { assertRefs, defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const w = await findInOrg(Warden, auth, params.id, 'Warden');
  await w.populate([{ path: 'hostels', select: 'name code type' }, { path: 'user', select: 'isActive lastLoginAt emailVerified' }]);
  return ok(w);
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, wardenUpdateSchema);
  const w = await findInOrg(Warden, auth, params.id, 'Warden');
  if (body.hostels) for (const h of body.hostels) await assertRefs(auth, [[Hostel, h, 'Hostel']]);
  const { isActive, ...rest } = body;
  w.set(defined(rest));
  await w.save();
  const userSet = defined({ name: body.name, phone: body.phone, isActive });
  if (Object.keys(userSet).length) await User.updateOne({ _id: w.user }, userSet);
  await audit(auth, 'UPDATE', 'Warden', w._id, { fields: Object.keys(body) }, req);
  return ok(w);
});

/** Removes the warden profile and deactivates the login. */
export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const w = await findInOrg(Warden, auth, params.id, 'Warden');
  if (String(w.user) === auth.userId) throw new ApiError(400, 'You cannot remove yourself');
  await User.updateOne({ _id: w.user }, { isActive: false });
  await Warden.deleteOne({ _id: w._id });
  await audit(auth, 'DELETE', 'Warden', w._id, undefined, req);
  return ok({ _id: w._id, deleted: true });
});
