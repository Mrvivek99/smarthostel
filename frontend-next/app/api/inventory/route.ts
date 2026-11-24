import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { inventorySchema } from '@/lib/validation';
import { INVENTORY_CATEGORIES, INVENTORY_CONDITIONS } from '@/lib/constants';
import { Hostel, Inventory, Room } from '@/lib/models';
import { assertHostelAccess, hostelScope, scoped } from '@/lib/services/scope';
import { and, assertRefs, enumParam, idParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  const category = enumParam(req, 'category', INVENTORY_CATEGORIES);
  const condition = enumParam(req, 'condition', INVENTORY_CONDITIONS);
  const room = idParam(req, 'room');
  if (hostel) filter.hostel = hostel;
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (room) filter.assignedRoom = room;
  const f = await hostelScope(auth, filter);
  return paginate(Inventory, and(f, searchFilter(qp(req, 'q'), ['name', 'notes'])), req, {
    sort: { name: 1 },
    populate: [{ path: 'hostel', select: 'name code' }, { path: 'assignedRoom', select: 'roomNumber' }],
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const body = await parseBody(req, inventorySchema);
  await assertHostelAccess(auth, body.hostel);
  const [, room]: any[] = await assertRefs(auth, [[Hostel, body.hostel, 'Hostel'], [Room, body.assignedRoom, 'Room']]);
  if (room && String(room.hostel) !== body.hostel) throw new ApiError(400, 'Room does not belong to the selected hostel');
  const item: any = await Inventory.create({ ...body, organization: auth.organizationId });
  await audit(auth, 'CREATE', 'Inventory', item._id, { name: body.name, quantity: body.quantity }, req);
  return ok(item, { status: 201 });
});
