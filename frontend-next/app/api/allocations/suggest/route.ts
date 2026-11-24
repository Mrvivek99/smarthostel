import { handler, ok, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { ROOM_TYPES } from '@/lib/constants';
import { suggestBeds } from '@/lib/services/allocation';
import { enumParam, idParam, qp } from '@/lib/crud';

/** GET /api/allocations/suggest?student=<id>[&hostel=<id>][&roomType=SINGLE][&limit=10] */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const student = idParam(req, 'student');
  if (!student) throw new ApiError(400, 'student is required');
  const limit = Math.min(50, Math.max(1, parseInt(qp(req, 'limit') ?? '10', 10) || 10));
  const data = await suggestBeds({ orgId: auth.organizationId, studentId: student, hostelId: idParam(req, 'hostel'), roomType: enumParam(req, 'roomType', ROOM_TYPES), limit });
  return ok(data);
});
