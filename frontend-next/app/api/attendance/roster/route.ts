import { handler, ok, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { assertHostelAccess } from '@/lib/services/scope';
import { rosterFor } from '@/lib/services/attendance';
import { findInOrg, idParam, qp } from '@/lib/crud';
import { Hostel } from '@/lib/models';
import { todayStr } from '@/lib/utils';

/** Marking sheet: students currently in the hostel with any existing mark for ?date (default today). */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const hostel = idParam(req, 'hostel');
  if (!hostel) throw new ApiError(400, 'hostel is required');
  const date = qp(req, 'date') ?? todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, 'date must be YYYY-MM-DD');
  await assertHostelAccess(auth, hostel);
  await findInOrg(Hostel, auth, hostel, 'Hostel');
  return ok(await rosterFor(auth.organizationId, hostel, date), { meta: undefined });
});
