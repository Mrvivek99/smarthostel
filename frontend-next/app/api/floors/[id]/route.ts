import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { floorUpdateSchema } from '@/lib/validation';
import { Floor, Room } from '@/lib/models';
import { defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, floorUpdateSchema);
  const f = await findInOrg(Floor, auth, params.id, 'Floor');
  f.set(defined(body));
  await f.save();
  await audit(auth, 'UPDATE', 'Floor', f._id, { fields: Object.keys(body) }, req);
  return ok(f);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const f = await findInOrg(Floor, auth, params.id, 'Floor');
  if (await Room.exists({ floor: f._id })) throw new ApiError(409, 'Remove the rooms on this floor first');
  await Floor.deleteOne({ _id: f._id });
  await audit(auth, 'DELETE', 'Floor', f._id, undefined, req);
  return ok({ _id: f._id, deleted: true });
});
