import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { floorSchema } from '@/lib/validation';
import { Building, Floor } from '@/lib/models';
import { hostelScope, scoped } from '@/lib/services/scope';
import { assertRefs, idParam } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  const building = idParam(req, 'building');
  if (hostel) filter.hostel = hostel;
  if (building) filter.building = building;
  return paginate(Floor, await hostelScope(auth, filter), req, { sort: { number: 1 }, populate: { path: 'building', select: 'name code' }, defaultLimit: 100 });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, floorSchema);
  const [building]: any[] = await assertRefs(auth, [[Building, body.building, 'Building']]);
  if (String(building.hostel) !== body.hostel) throw new ApiError(400, 'Building does not belong to the selected hostel');
  const f = await Floor.create({ ...body, organization: auth.organizationId });
  await audit(auth, 'CREATE', 'Floor', f._id, { number: body.number }, req);
  return ok(f, { status: 201 });
});
