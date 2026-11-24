import { ClientSession } from 'mongoose';
import { ApiError } from '@/lib/api';
import { withTransaction } from '@/lib/db';
import { Bed, Hostel, Room, RoomAllocation, Student, Floor } from '@/lib/models';
import { BedCandidate, checkAllocation, isGenderEligible, rankBeds } from '@/lib/services/allocationRules';
import { notify } from '@/lib/services/notify';

type Undo = Array<() => Promise<unknown>>;
const ss = (s: ClientSession | undefined) => s ?? null;

async function rollback(session: ClientSession | undefined, undo: Undo) {
  // With a real transaction the abort reverts everything; otherwise compensate manually.
  if (session) return;
  for (const u of undo.reverse()) await u().catch((e) => console.error('[allocation] compensation failed', e));
}

async function loadContext(orgId: string, studentId: string, bedId: string, session: ClientSession | undefined) {
  const student: any = await Student.findOne({ _id: studentId, organization: orgId }).session(ss(session));
  if (!student) throw new ApiError(404, 'Student not found');
  const bed: any = await Bed.findOne({ _id: bedId, organization: orgId }).session(ss(session));
  if (!bed) throw new ApiError(404, 'Bed not found');
  const room: any = await Room.findOne({ _id: bed.room, organization: orgId }).session(ss(session));
  const hostel: any = await Hostel.findOne({ _id: bed.hostel, organization: orgId }).session(ss(session));
  if (!room || !hostel) throw new ApiError(404, 'Room or hostel not found');
  const occupied = await Bed.countDocuments({ room: room._id, status: 'OCCUPIED' }).session(ss(session));
  return { student, bed, room, hostel, occupied };
}

function assertRules(c: Awaited<ReturnType<typeof loadContext>>, studentHasActiveAllocation: boolean) {
  const r = checkAllocation({
    studentStatus: c.student.status,
    studentGender: c.student.gender,
    studentHasActiveAllocation,
    hostelType: c.hostel.type,
    hostelActive: c.hostel.isActive,
    roomStatus: c.room.status,
    roomCapacity: c.room.capacity,
    roomOccupiedBeds: c.occupied,
    bedStatus: c.bed.status,
  });
  if (!r.ok) throw new ApiError(409, r.message, { code: r.code });
}

/** Atomically claims a bed (AVAILABLE -> OCCUPIED). Returns null when someone else got it first. */
function claimBed(orgId: string, bedId: string, session: ClientSession | undefined) {
  return Bed.findOneAndUpdate({ _id: bedId, organization: orgId, status: 'AVAILABLE' }, { status: 'OCCUPIED' }, { new: true, session: ss(session) });
}

export async function allocateBed(p: { orgId: string; studentId: string; bedId: string; by: string; remarks?: string }) {
  const alloc = await withTransaction(async (session) => {
    const undo: Undo = [];
    try {
      const c = await loadContext(p.orgId, p.studentId, p.bedId, session);
      const existing = await RoomAllocation.exists({ student: c.student._id, status: 'ACTIVE' }).session(ss(session));
      assertRules(c, Boolean(existing));

      const claimed = await claimBed(p.orgId, p.bedId, session);
      if (!claimed) throw new ApiError(409, 'Bed is no longer available', { code: 'BED_OCCUPIED' });
      undo.push(() => Bed.updateOne({ _id: p.bedId }, { status: 'AVAILABLE' }));

      const [doc] = await RoomAllocation.create(
        [{ organization: p.orgId, student: c.student._id, bed: c.bed._id, room: c.room._id, hostel: c.hostel._id, status: 'ACTIVE', checkInDate: new Date(), allocatedBy: p.by, remarks: p.remarks }],
        { session }
      );
      undo.push(() => RoomAllocation.deleteOne({ _id: doc._id }));

      await Student.updateOne({ _id: c.student._id }, { hostel: c.hostel._id, room: c.room._id, bed: c.bed._id }, { session });
      return { doc, userId: c.student.user, roomNumber: c.room.roomNumber, bedNumber: c.bed.bedNumber, hostelName: c.hostel.name };
    } catch (e) {
      await rollback(session, undo);
      throw e;
    }
  });
  await notify(p.orgId, [alloc.userId], {
    type: 'ALLOCATION',
    title: 'Room allocated',
    message: `You have been allocated bed ${alloc.bedNumber} in room ${alloc.roomNumber}, ${alloc.hostelName}.`,
    link: '/student/room',
  });
  return alloc.doc;
}

export async function checkoutAllocation(p: { orgId: string; allocationId: string; by: string; remarks?: string }) {
  const result = await withTransaction(async (session) => {
    const undo: Undo = [];
    try {
      const closed: any = await RoomAllocation.findOneAndUpdate(
        { _id: p.allocationId, organization: p.orgId, status: 'ACTIVE' },
        { status: 'CHECKED_OUT', checkOutDate: new Date(), ...(p.remarks ? { remarks: p.remarks } : {}) },
        { new: true, session: ss(session) }
      );
      if (!closed) {
        const exists = await RoomAllocation.exists({ _id: p.allocationId, organization: p.orgId });
        throw new ApiError(exists ? 409 : 404, exists ? 'Allocation is not active' : 'Allocation not found');
      }
      undo.push(() => RoomAllocation.updateOne({ _id: closed._id }, { status: 'ACTIVE', $unset: { checkOutDate: 1 } }));
      await Bed.updateOne({ _id: closed.bed, status: 'OCCUPIED' }, { status: 'AVAILABLE' }, { session });
      undo.push(() => Bed.updateOne({ _id: closed.bed }, { status: 'OCCUPIED' }));
      await Student.updateOne({ _id: closed.student }, { $unset: { hostel: 1, room: 1, bed: 1 } }, { session });
      return closed;
    } catch (e) {
      await rollback(session, undo);
      throw e;
    }
  });
  const student: any = await Student.findById(result.student).select('user').lean();
  await notify(p.orgId, [student?.user], { type: 'ALLOCATION', title: 'Checked out', message: 'Your hostel check-out has been recorded.', link: '/student/room' });
  return result;
}

export async function transferAllocation(p: { orgId: string; allocationId: string; newBedId: string; by: string; remarks?: string }) {
  const out = await withTransaction(async (session) => {
    const undo: Undo = [];
    try {
      const old: any = await RoomAllocation.findOne({ _id: p.allocationId, organization: p.orgId, status: 'ACTIVE' }).session(ss(session));
      if (!old) throw new ApiError(404, 'Active allocation not found');
      if (String(old.bed) === p.newBedId) throw new ApiError(400, 'Student is already in this bed');

      const c = await loadContext(p.orgId, String(old.student), p.newBedId, session);
      assertRules(c, false); // the existing active allocation is the one being replaced

      const claimed = await claimBed(p.orgId, p.newBedId, session);
      if (!claimed) throw new ApiError(409, 'Target bed is no longer available', { code: 'BED_OCCUPIED' });
      undo.push(() => Bed.updateOne({ _id: p.newBedId }, { status: 'AVAILABLE' }));

      const released = await RoomAllocation.findOneAndUpdate(
        { _id: old._id, status: 'ACTIVE' },
        { status: 'TRANSFERRED', checkOutDate: new Date() },
        { new: true, session: ss(session) }
      );
      if (!released) throw new ApiError(409, 'Allocation changed concurrently, retry');
      undo.push(() => RoomAllocation.updateOne({ _id: old._id }, { status: 'ACTIVE', $unset: { checkOutDate: 1 } }));

      await Bed.updateOne({ _id: old.bed, status: 'OCCUPIED' }, { status: 'AVAILABLE' }, { session });
      undo.push(() => Bed.updateOne({ _id: old.bed }, { status: 'OCCUPIED' }));

      const [doc] = await RoomAllocation.create(
        [{ organization: p.orgId, student: old.student, bed: c.bed._id, room: c.room._id, hostel: c.hostel._id, status: 'ACTIVE', checkInDate: new Date(), allocatedBy: p.by, transferredFrom: old._id, remarks: p.remarks }],
        { session }
      );
      undo.push(() => RoomAllocation.deleteOne({ _id: doc._id }));

      await Student.updateOne({ _id: old.student }, { hostel: c.hostel._id, room: c.room._id, bed: c.bed._id }, { session });
      return { doc, userId: c.student.user, roomNumber: c.room.roomNumber, bedNumber: c.bed.bedNumber };
    } catch (e) {
      await rollback(session, undo);
      throw e;
    }
  });
  await notify(p.orgId, [out.userId], {
    type: 'ALLOCATION',
    title: 'Room transfer',
    message: `You have been moved to bed ${out.bedNumber} in room ${out.roomNumber}.`,
    link: '/student/room',
  });
  return out.doc;
}

/** Suggests eligible available beds for a student, best first. */
export async function suggestBeds(p: { orgId: string; studentId: string; hostelId?: string; roomType?: 'SINGLE' | 'DOUBLE' | 'SHARED'; limit?: number }) {
  const student: any = await Student.findOne({ _id: p.studentId, organization: p.orgId }).lean();
  if (!student) throw new ApiError(404, 'Student not found');
  const hostels: any[] = await Hostel.find({ organization: p.orgId, isActive: true }).select('name type').lean();
  const eligible = hostels.filter((h) => isGenderEligible(h.type, student.gender));
  const eligibleIds = eligible.map((h) => h._id);
  if (!eligibleIds.length) return [];

  const beds: any[] = await Bed.find({ organization: p.orgId, status: 'AVAILABLE', hostel: { $in: eligibleIds } })
    .populate({ path: 'room', select: 'roomNumber type capacity status floor building' })
    .limit(500)
    .lean();
  const rooms = beds.map((b) => b.room).filter((r) => r && r.status === 'ACTIVE');
  const roomIds = Array.from(new Set(rooms.map((r) => String(r._id))));
  const [occupiedAgg, floors] = await Promise.all([
    Bed.aggregate([{ $match: { room: { $in: rooms.map((r) => r._id) }, status: 'OCCUPIED' } }, { $group: { _id: '$room', n: { $sum: 1 } } }]),
    Floor.find({ _id: { $in: rooms.map((r) => r.floor) } }).select('number').lean(),
  ]);
  const occ = new Map<string, number>(occupiedAgg.map((o: any) => [String(o._id), o.n]));
  const floorNo = new Map<string, number>(floors.map((f: any) => [String(f._id), f.number]));
  const hostelName = new Map(hostels.map((h) => [String(h._id), h.name as string]));

  type Cand = BedCandidate & { bedNumber: string; roomNumber: string; hostelName: string };
  const candidates: Cand[] = beds
    .filter((b) => b.room && b.room.status === 'ACTIVE' && roomIds.includes(String(b.room._id)))
    .map((b) => ({
      bedId: String(b._id),
      roomId: String(b.room._id),
      hostelId: String(b.hostel),
      roomType: b.room.type,
      occupied: occ.get(String(b.room._id)) ?? 0,
      capacity: b.room.capacity,
      floorNumber: floorNo.get(String(b.room.floor)) ?? 0,
      bedNumber: b.bedNumber,
      roomNumber: b.room.roomNumber,
      hostelName: hostelName.get(String(b.hostel)) ?? '',
    }))
    .filter((c) => c.occupied < c.capacity)
    .filter((c) => !p.hostelId || c.hostelId === p.hostelId);

  const prefs = { preferredHostelId: p.hostelId, preferredRoomType: p.roomType };
  return rankBeds(candidates, prefs).slice(0, p.limit ?? 10);
}
