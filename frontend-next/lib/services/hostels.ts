import { Bed, Warden } from '@/lib/models';
import { toObjectId } from '@/lib/crud';

/** Bed counts per hostel: { [hostelId]: { total, occupied, available, maintenance } } */
export async function bedStatsByHostel(orgId: string, hostelIds?: unknown[]) {
  const match: Record<string, any> = orgId ? { organization: toObjectId(orgId) } : {};
  if (hostelIds) match.hostel = { $in: hostelIds.map((h) => toObjectId(String(h))) };
  const rows: any[] = await Bed.aggregate([{ $match: match }, { $group: { _id: { hostel: '$hostel', status: '$status' }, n: { $sum: 1 } } }]);
  const out: Record<string, { total: number; occupied: number; available: number; maintenance: number }> = {};
  for (const r of rows) {
    const k = String(r._id.hostel);
    const o = (out[k] ??= { total: 0, occupied: 0, available: 0, maintenance: 0 });
    o.total += r.n;
    if (r._id.status === 'OCCUPIED') o.occupied += r.n;
    else if (r._id.status === 'AVAILABLE') o.available += r.n;
    else o.maintenance += r.n;
  }
  return out;
}

export const emptyBedStats = { total: 0, occupied: 0, available: 0, maintenance: 0 };

/** Makes the given wardens (Warden profile ids OR user ids) the exact warden set of a hostel. */
export async function syncHostelWardens(orgId: string, hostelId: string, wardenIds: string[]) {
  const wardens: any[] = wardenIds.length
    ? await Warden.find({ organization: orgId, $or: [{ _id: { $in: wardenIds } }, { user: { $in: wardenIds } }] }).select('_id').lean()
    : [];
  const ids = wardens.map((w) => w._id);
  await Warden.updateMany({ organization: orgId, _id: { $in: ids } }, { $addToSet: { hostels: hostelId } });
  await Warden.updateMany({ organization: orgId, hostels: hostelId, _id: { $nin: ids } }, { $pull: { hostels: hostelId } });
  return ids.length;
}
