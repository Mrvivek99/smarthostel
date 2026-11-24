import { handler, ok, parseBody, paginate } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { buildingSchema } from '@/lib/validation';
import { Building, Hostel } from '@/lib/models';
import { assertHostelAccess, hostelScope, scoped } from '@/lib/services/scope';
import { and, assertRefs, idParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostel = hostel;
  const scopedFilter = await hostelScope(auth, filter);
  return paginate(Building, and(scopedFilter, searchFilter(qp(req, 'q'), ['name', 'code'])), req, { sort: { name: 1 }, populate: { path: 'hostel', select: 'name code' }, defaultLimit: 50 });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, buildingSchema);
  await assertRefs(auth, [[Hostel, body.hostel, 'Hostel']]);
  const b = await Building.create({ ...body, organization: auth.organizationId });
  await audit(auth, 'CREATE', 'Building', b._id, { name: body.name }, req);
  return ok(b, { status: 201 });
});
