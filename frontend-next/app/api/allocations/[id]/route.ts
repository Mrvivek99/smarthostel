import { handler, ok, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { allocationActionSchema } from '@/lib/validation';
import { RoomAllocation } from '@/lib/models';
import { checkoutAllocation, transferAllocation } from '@/lib/services/allocation';
import { assertRecordAccess, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

const POPULATE = [
  { path: 'student', select: 'name email phone enrollmentNo gender' },
  { path: 'hostel', select: 'name code' },
  { path: 'room', select: 'roomNumber type' },
  { path: 'bed', select: 'bedNumber' },
];

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const a = await findInOrg(RoomAllocation, auth, params.id, 'Allocation');
  await assertRecordAccess(auth, a);
  await a.populate(POPULATE);
  return ok(a);
});

/** PATCH { action: 'checkout' } or { action: 'transfer', bed } */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, allocationActionSchema);
  const existing = await findInOrg(RoomAllocation, auth, params.id, 'Allocation');
  let result: any;
  if (body.action === 'checkout') {
    result = await checkoutAllocation({ orgId: auth.organizationId, allocationId: String(existing._id), by: auth.userId, remarks: body.remarks });
    await audit(auth, 'CHECKOUT', 'RoomAllocation', existing._id, { student: String(existing.student) }, req);
  } else {
    result = await transferAllocation({ orgId: auth.organizationId, allocationId: String(existing._id), newBedId: body.bed, by: auth.userId, remarks: body.remarks });
    await audit(auth, 'TRANSFER', 'RoomAllocation', existing._id, { student: String(existing.student), from: String(existing.bed), to: body.bed, newAllocation: String(result._id) }, req);
  }
  const populated = await RoomAllocation.findById(result._id).populate(POPULATE).lean();
  return ok(populated);
});
