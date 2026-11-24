import { handler, ok, parseBody, paginate } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { feeStructureSchema } from '@/lib/validation';
import { ROOM_TYPES } from '@/lib/constants';
import { FeeStructure, Hostel } from '@/lib/models';
import { scoped, wardenHostelIds, studentOf } from '@/lib/services/scope';
import { and, assertRefs, boolParam, enumParam, idParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  let filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  const roomType = enumParam(req, 'roomType', ROOM_TYPES);
  const active = boolParam(req, 'active');
  if (roomType) filter.roomType = roomType;
  if (auth.role === 'ADMIN') {
    if (hostel) filter.hostel = hostel;
    if (active !== undefined) filter.isActive = active;
  } else {
    // Read-only for everyone else: active structures that apply to their hostel(s) or to all hostels.
    filter.isActive = true;
    const hostelIds = auth.role === 'WARDEN' ? await wardenHostelIds(auth) : (await studentOf(auth)).hostel ? [String((await studentOf(auth)).hostel)] : [];
    filter = and(filter, { $or: [{ hostel: { $exists: false } }, { hostel: null }, { hostel: { $in: hostelIds } }] });
  }
  return paginate(FeeStructure, and(filter, searchFilter(qp(req, 'q'), ['name'])), req, { sort: { name: 1 }, populate: { path: 'hostel', select: 'name code' } });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, feeStructureSchema);
  await assertRefs(auth, [[Hostel, body.hostel, 'Hostel']]);
  const fs: any = await FeeStructure.create({ ...body, organization: auth.organizationId });
  await audit(auth, 'CREATE', 'FeeStructure', fs._id, { name: fs.name }, req);
  return ok(fs, { status: 201 });
});
