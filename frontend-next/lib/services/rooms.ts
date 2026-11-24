import { ApiError } from '@/lib/api';
import { Bed } from '@/lib/models';
import { toObjectId } from '@/lib/crud';

/** Bed counts per room: { [roomId]: { total, occupied, available, maintenance } } */
export async function bedStatsByRoom(orgId: string, roomIds: unknown[]) {
  const rows: any[] = await Bed.aggregate([
    { $match: { organization: toObjectId(orgId), room: { $in: roomIds.map((r) => toObjectId(String(r))) } } },
    { $group: { _id: { room: '$room', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const out: Record<string, { total: number; occupied: number; available: number; maintenance: number }> = {};
  for (const r of rows) {
    const o = (out[String(r._id.room)] ??= { total: 0, occupied: 0, available: 0, maintenance: 0 });
    o.total += r.n;
    if (r._id.status === 'OCCUPIED') o.occupied += r.n;
    else if (r._id.status === 'AVAILABLE') o.available += r.n;
    else o.maintenance += r.n;
  }
  return out;
}

export const emptyRoomStats = { total: 0, occupied: 0, available: 0, maintenance: 0 };

/** Lowest unused "B<n>" style bed number within a room. */
export function nextBedNumber(existing: string[]): string {
  const used = new Set(existing.map((s) => s.toUpperCase()));
  for (let i = 1; i < 1000; i++) if (!used.has(`B${i}`)) return `B${i}`;
  throw new ApiError(409, 'Too many beds in this room');
}

/** Creates `count` beds in a room (B1, B2, ...) skipping numbers already in use. */
export async function createBeds(orgId: string, hostelId: unknown, roomId: unknown, count: number, existing: string[] = []) {
  const names = [...existing];
  const docs = [];
  for (let i = 0; i < count; i++) {
    const n = nextBedNumber(names);
    names.push(n);
    docs.push({ organization: orgId, hostel: hostelId, room: roomId, bedNumber: n, status: 'AVAILABLE' });
  }
  return docs.length ? Bed.insertMany(docs) : [];
}
