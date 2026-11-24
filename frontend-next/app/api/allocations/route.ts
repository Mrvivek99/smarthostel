import { handler, ok, parseBody, paginate } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { allocationCreateSchema } from '@/lib/validation';
import { ALLOCATION_STATUSES } from '@/lib/constants';
import { RoomAllocation } from '@/lib/models';
import { scoped } from '@/lib/services/scope';
import { allocateBed } from '@/lib/services/allocation';
import { dateRange, enumParam, idParam, roleScopedFilter, and } from '@/lib/crud';
import { audit } from '@/lib/audit';

const POPULATE = [
  { path: 'student', select: 'name email phone enrollmentNo gender' },
  { path: 'hostel', select: 'name code' },
  { path: 'room', select: 'roomNumber type' },
  { path: 'bed', select: 'bedNumber' },
];

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const filter: Record<string, any> = scoped(auth);
  const status = enumParam(req, 'status', ALLOCATION_STATUSES);
  if (status) filter.status = status;
  const hostel = idParam(req, 'hostel');
  const room = idParam(req, 'room');
  const student = idParam(req, 'student');
  if (hostel) filter.hostel = hostel;
  if (room) filter.room = room;
  if (student && auth.role !== 'STUDENT') filter.student = student;
  const f = await roleScopedFilter(auth, filter);
  return paginate(RoomAllocation, and(f, dateRange(req, 'checkInDate')), req, { sort: { createdAt: -1 }, populate: POPULATE });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, allocationCreateSchema);
  const alloc: any = await allocateBed({ orgId: auth.organizationId, studentId: body.student, bedId: body.bed, by: auth.userId, remarks: body.remarks });
  await audit(auth, 'ALLOCATE', 'RoomAllocation', alloc._id, { student: body.student, bed: body.bed }, req);
  const populated = await RoomAllocation.findById(alloc._id).populate(POPULATE).lean();
  return ok(populated, { status: 201 });
});
