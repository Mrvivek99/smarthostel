import { handler, ok } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { Hostel } from '@/lib/models';
import { revenueReport } from '@/lib/services/analytics';
import { findInOrg, idParam, qp } from '@/lib/crud';

/** GET /api/admin/revenue?months=12[&hostel=<id>] -> monthly revenue / refunds / expenses / profit + totals. */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const months = Math.min(36, Math.max(1, parseInt(qp(req, 'months') ?? '12', 10) || 12));
  const hostel = idParam(req, 'hostel');
  if (hostel) await findInOrg(Hostel, auth, hostel, 'Hostel');
  return ok(await revenueReport(auth.organizationId, months, hostel));
});
