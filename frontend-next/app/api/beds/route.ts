import { handler, ok, parseBody, getPaging, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { bedCreateSchema } from '@/lib/validation';
import { BED_STATUSES } from '@/lib/constants';
import { Bed, Room } from '@/lib/models';
import { scoped, hostelScope } from '@/lib/services/scope';
import { nextBedNumber } from '@/lib/services/rooms';
import { enumParam, findInOrg, idParam } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const { page, limit, skip } = getPaging(req, 100, 500);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  const room = idParam(req, 'room');
  const status = enumParam(req, 'status', BED_STATUSES);
  if (hostel) filter.hostel = hostel;
  if (room) filter.room = room;
  if (status) filter.status = status;
  const f = await hostelScope(auth, filter);
  const [items, total] = await Promise.all([
    Bed.find(f)
      .sort({ room: 1, bedNumber: 1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'room', select: 'roomNumber type capacity status floor building', populate: [{ path: 'floor', select: 'number' }, { path: 'building', select: 'name' }] })
      .populate('hostel', 'name code')
      .lean(),
    Bed.countDocuments(f),
  ]);
  return ok(items, { meta: { page, limit, total } });
});

/** Adds one bed to a room (up to the room capacity). */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, bedCreateSchema);
  const room = await findInOrg(Room, auth, body.room, 'Room');
  const existing: any[] = await Bed.find({ room: room._id }).select('bedNumber').lean();
  if (existing.length >= room.capacity) throw new ApiError(409, `Room capacity (${room.capacity}) reached. Increase the room capacity first.`);
  const bedNumber = body.bedNumber ?? nextBedNumber(existing.map((b) => b.bedNumber));
  const bed = await Bed.create({ organization: auth.organizationId, hostel: room.hostel, room: room._id, bedNumber, status: 'AVAILABLE' });
  await audit(auth, 'CREATE', 'Bed', bed._id, { room: String(room._id), bedNumber }, req);
  return ok(bed, { status: 201 });
});
