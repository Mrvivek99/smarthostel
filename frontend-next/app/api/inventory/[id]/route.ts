import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { inventoryUpdateSchema } from '@/lib/validation';
import { Inventory, Room } from '@/lib/models';
import { assertHostelAccess } from '@/lib/services/scope';
import { assertRefs, defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const item = await findInOrg(Inventory, auth, params.id, 'Inventory item');
  await assertHostelAccess(auth, item.hostel);
  await item.populate([{ path: 'hostel', select: 'name code' }, { path: 'assignedRoom', select: 'roomNumber' }]);
  return ok(item);
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const { maintenance, hostel, ...body } = await parseBody(req, inventoryUpdateSchema);
  const item = await findInOrg(Inventory, auth, params.id, 'Inventory item');
  await assertHostelAccess(auth, item.hostel);
  if (hostel && hostel !== String(item.hostel)) throw new ApiError(400, 'An item cannot be moved to a different hostel');
  if (body.assignedRoom) {
    const [room]: any[] = await assertRefs(auth, [[Room, body.assignedRoom, 'Room']]);
    if (String(room.hostel) !== String(item.hostel)) throw new ApiError(400, 'Room does not belong to this hostel');
  }
  item.set(defined(body));
  if (maintenance) item.maintenanceLog.push({ ...maintenance, date: new Date(), by: auth.userId });
  await item.save();
  await audit(auth, 'UPDATE', 'Inventory', item._id, { fields: Object.keys(body), maintenance: Boolean(maintenance) }, req);
  return ok(item);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const item = await findInOrg(Inventory, auth, params.id, 'Inventory item');
  await Inventory.deleteOne({ _id: item._id });
  await audit(auth, 'DELETE', 'Inventory', item._id, { name: item.name }, req);
  return ok({ _id: item._id, deleted: true });
});
