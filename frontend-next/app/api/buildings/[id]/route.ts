import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { buildingUpdateSchema } from '@/lib/validation';
import { Building, Floor, Room } from '@/lib/models';
import { assertHostelAccess } from '@/lib/services/scope';
import { defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const b = await findInOrg(Building, auth, params.id, 'Building');
  await assertHostelAccess(auth, b.hostel);
  const floors = await Floor.find({ building: b._id }).sort({ number: 1 }).lean();
  return ok({ ...b.toObject(), floors });
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, buildingUpdateSchema);
  const b = await findInOrg(Building, auth, params.id, 'Building');
  b.set(defined(body));
  await b.save();
  await audit(auth, 'UPDATE', 'Building', b._id, { fields: Object.keys(body) }, req);
  return ok(b);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const b = await findInOrg(Building, auth, params.id, 'Building');
  if (await Room.exists({ building: b._id })) throw new ApiError(409, 'Remove the rooms in this building first');
  await Floor.deleteMany({ building: b._id });
  await Building.deleteOne({ _id: b._id });
  await audit(auth, 'DELETE', 'Building', b._id, { name: b.name }, req);
  return ok({ _id: b._id, deleted: true });
});
