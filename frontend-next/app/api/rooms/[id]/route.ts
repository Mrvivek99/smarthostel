import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { roomUpdateSchema } from '@/lib/validation';
import { Bed, Room, RoomAllocation } from '@/lib/models';
import { assertHostelAccess, studentOf } from '@/lib/services/scope';
import { resolveRoomCapacity } from '@/lib/services/allocationRules';
import { bedStatsByRoom, createBeds, emptyRoomStats } from '@/lib/services/rooms';
import { defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const room = await findInOrg(Room, auth, params.id, 'Room');
  if (auth.role === 'WARDEN') await assertHostelAccess(auth, room.hostel);
  await room.populate([{ path: 'hostel', select: 'name code type' }, { path: 'building', select: 'name code' }, { path: 'floor', select: 'number label' }]);
  const beds: any[] = await Bed.find({ room: room._id }).sort({ bedNumber: 1 }).lean();
  const stats = (await bedStatsByRoom(auth.organizationId, [room._id]))[String(room._id)] ?? emptyRoomStats;

  const allocations: any[] = await RoomAllocation.find({ room: room._id, status: 'ACTIVE' }).populate('student', 'name email phone course').lean();
  const byBed = new Map(allocations.map((a) => [String(a.bed), a]));
  if (auth.role === 'STUDENT') {
    // Students may see a room's occupancy only for the room they live in; roommates are limited to names.
    const me = await studentOf(auth);
    if (String(me.room) !== String(room._id)) throw new ApiError(404, 'Room not found');
    const roommates = allocations.filter((a) => String(a.student?._id) !== String(me._id)).map((a) => ({ name: a.student?.name, bedNumber: beds.find((b) => String(b._id) === String(a.bed))?.bedNumber }));
    return ok({ ...room.toObject(), beds: beds.map((b) => ({ _id: b._id, bedNumber: b.bedNumber, status: b.status })), stats, roommates });
  }
  const bedList = beds.map((b) => ({ ...b, occupant: byBed.get(String(b._id))?.student ?? undefined }));
  return ok({ ...room.toObject(), beds: bedList, stats });
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, roomUpdateSchema);
  const room = await findInOrg(Room, auth, params.id, 'Room');
  const beds: any[] = await Bed.find({ room: room._id }).select('bedNumber status').lean();
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;

  if (body.status === 'MAINTENANCE' && occupied > 0) throw new ApiError(409, 'Check out or transfer the students in this room before marking it under maintenance');

  const resizing = body.type !== undefined || body.capacity !== undefined;
  let capacity = room.capacity as number;
  if (resizing) {
    const type = body.type ?? room.type;
    const requested = body.capacity ?? (type === room.type ? room.capacity : undefined);
    capacity = resolveRoomCapacity(type, requested);
    if (body.capacity !== undefined && type !== 'SHARED' && body.capacity !== capacity) throw new ApiError(400, `${type} rooms have a fixed capacity of ${capacity}`);
    if (capacity < occupied) throw new ApiError(409, `Cannot reduce capacity below the ${occupied} occupied bed(s)`);
    if (beds.length > capacity) {
      const removable = beds.filter((b) => b.status !== 'OCCUPIED').sort((a, b) => String(b.bedNumber).localeCompare(String(a.bedNumber), undefined, { numeric: true }));
      const surplus = beds.length - capacity;
      const drop = removable.slice(0, surplus);
      if (drop.length < surplus) throw new ApiError(409, 'Not enough vacant beds to remove for this capacity');
      const history = await RoomAllocation.exists({ bed: { $in: drop.map((b) => b._id) } });
      if (history) throw new ApiError(409, 'Beds to be removed have allocation history. Mark them under maintenance instead.');
    }
  }

  // Only touch beds once every check has passed.
  if (resizing) {
    if (beds.length > capacity) {
      const removable = beds.filter((b) => b.status !== 'OCCUPIED').sort((a, b) => String(b.bedNumber).localeCompare(String(a.bedNumber), undefined, { numeric: true }));
      await Bed.deleteMany({ _id: { $in: removable.slice(0, beds.length - capacity).map((b) => b._id) } });
    } else if (beds.length < capacity) {
      await createBeds(auth.organizationId, room.hostel, room._id, capacity - beds.length, beds.map((b) => b.bedNumber));
    }
  }
  room.set(defined({ ...body, ...(resizing ? { capacity } : {}) }));
  await room.save();
  await audit(auth, 'UPDATE', 'Room', room._id, { fields: Object.keys(body) }, req);
  return ok(room);
});

/** Only vacant rooms without allocation history can be deleted. */
export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const room = await findInOrg(Room, auth, params.id, 'Room');
  if (await Bed.exists({ room: room._id, status: 'OCCUPIED' })) throw new ApiError(409, 'Room is occupied and cannot be deleted');
  if (await RoomAllocation.exists({ room: room._id, status: 'ACTIVE' })) throw new ApiError(409, 'Room has active allocations and cannot be deleted');
  if (await RoomAllocation.exists({ room: room._id })) throw new ApiError(409, 'Room has allocation history. Mark it under maintenance instead of deleting it.');
  await Bed.deleteMany({ room: room._id });
  await Room.deleteOne({ _id: room._id });
  await audit(auth, 'DELETE', 'Room', room._id, { roomNumber: room.roomNumber }, req);
  return ok({ _id: room._id, deleted: true });
});
