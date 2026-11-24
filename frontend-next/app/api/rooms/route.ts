import { handler, ok, parseBody, getPaging, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { roomSchema } from '@/lib/validation';
import { ROOM_STATUSES, ROOM_TYPES } from '@/lib/constants';
import { Bed, Building, Floor, Hostel, Room } from '@/lib/models';
import { scoped, hostelScope } from '@/lib/services/scope';
import { resolveRoomCapacity } from '@/lib/services/allocationRules';
import { bedStatsByRoom, createBeds, emptyRoomStats } from '@/lib/services/rooms';
import { and, assertRefs, boolParam, enumParam, idParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const { page, limit, skip } = getPaging(req, 50, 200);
  let filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  const building = idParam(req, 'building');
  const floor = idParam(req, 'floor');
  const type = enumParam(req, 'type', ROOM_TYPES);
  const status = enumParam(req, 'status', ROOM_STATUSES);
  if (hostel) filter.hostel = hostel;
  if (building) filter.building = building;
  if (floor) filter.floor = floor;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (auth.role === 'WARDEN') filter = await hostelScope(auth, filter);
  if (auth.role === 'STUDENT') {
    // Students browse rooms of active hostels that are open for allocation.
    const hostels: any[] = await Hostel.find({ organization: auth.organizationId, isActive: true }).select('_id').lean();
    filter.hostel = hostel ? (hostels.some((h) => String(h._id) === hostel) ? hostel : { $in: [] }) : { $in: hostels.map((h) => h._id) };
    filter.status = 'ACTIVE';
  }
  const onlyAvailable = boolParam(req, 'available') === true;
  if (onlyAvailable) {
    const bedFilter: Record<string, any> = { organization: auth.organizationId, status: 'AVAILABLE' };
    if (filter.hostel) bedFilter.hostel = filter.hostel;
    filter._id = { $in: await Bed.distinct('room', bedFilter) };
    filter.status = 'ACTIVE';
  }
  filter = and(filter, searchFilter(qp(req, 'q'), ['roomNumber']));

  const [items, total] = await Promise.all([
    Room.find(filter)
      .sort({ roomNumber: 1 })
      .skip(skip)
      .limit(limit)
      .populate([{ path: 'hostel', select: 'name code type' }, { path: 'building', select: 'name code' }, { path: 'floor', select: 'number label' }])
      .lean(),
    Room.countDocuments(filter),
  ]);
  const stats = await bedStatsByRoom(auth.organizationId, items.map((r: any) => r._id));
  const data = items.map((r: any) => ({ ...r, beds: stats[String(r._id)] ?? emptyRoomStats }));
  return ok(data, { meta: { page, limit, total } });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const { createBeds: withBeds, ...body } = await parseBody(req, roomSchema);
  const [, building, floor]: any[] = await assertRefs(auth, [
    [Hostel, body.hostel, 'Hostel'],
    [Building, body.building, 'Building'],
    [Floor, body.floor, 'Floor'],
  ]);
  if (String(building.hostel) !== body.hostel) throw new ApiError(400, 'Building does not belong to the selected hostel');
  if (String(floor.building) !== body.building) throw new ApiError(400, 'Floor does not belong to the selected building');
  const capacity = resolveRoomCapacity(body.type, body.capacity);
  if (body.capacity !== undefined && body.type !== 'SHARED' && body.capacity !== capacity)
    throw new ApiError(400, `${body.type} rooms have a fixed capacity of ${capacity}`);

  const room: any = await Room.create({ ...body, capacity, organization: auth.organizationId });
  if (withBeds) {
    try {
      await createBeds(auth.organizationId, room.hostel, room._id, capacity);
    } catch (e) {
      await Bed.deleteMany({ room: room._id });
      await Room.deleteOne({ _id: room._id });
      throw e;
    }
  }
  await audit(auth, 'CREATE', 'Room', room._id, { roomNumber: room.roomNumber, capacity, beds: withBeds ? capacity : 0 }, req);
  return ok(room, { status: 201 });
});
