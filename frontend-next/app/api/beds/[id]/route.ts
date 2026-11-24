import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { bedUpdateSchema } from '@/lib/validation';
import { Bed, RoomAllocation } from '@/lib/models';
import { assertHostelAccess } from '@/lib/services/scope';
import { findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const bed = await findInOrg(Bed, auth, params.id, 'Bed');
  if (auth.role === 'WARDEN') await assertHostelAccess(auth, bed.hostel);
  await bed.populate([{ path: 'room', select: 'roomNumber type capacity status' }, { path: 'hostel', select: 'name code' }]);
  return ok(bed);
});

/** Toggle a vacant bed between AVAILABLE and MAINTENANCE (OCCUPIED is only ever set by the allocation engine). */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, bedUpdateSchema);
  const bed = await findInOrg(Bed, auth, params.id, 'Bed');
  const changed = await Bed.findOneAndUpdate({ _id: bed._id, status: { $ne: 'OCCUPIED' } }, { status: body.status }, { new: true });
  if (!changed) throw new ApiError(409, 'Bed is occupied. Check the student out or transfer them first.');
  await audit(auth, 'UPDATE', 'Bed', bed._id, { status: body.status }, req);
  return ok(changed);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const bed = await findInOrg(Bed, auth, params.id, 'Bed');
  if (bed.status === 'OCCUPIED') throw new ApiError(409, 'Bed is occupied and cannot be deleted');
  if (await RoomAllocation.exists({ bed: bed._id })) throw new ApiError(409, 'Bed has allocation history. Mark it under maintenance instead of deleting it.');
  await Bed.deleteOne({ _id: bed._id, status: { $ne: 'OCCUPIED' } });
  await audit(auth, 'DELETE', 'Bed', bed._id, { bedNumber: bed.bedNumber }, req);
  return ok({ _id: bed._id, deleted: true });
});
