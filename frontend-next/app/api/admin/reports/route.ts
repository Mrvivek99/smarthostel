import { handler, ok, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { Hostel } from '@/lib/models';
import { buildReport, REPORT_TYPES, ReportType } from '@/lib/services/analytics';
import { csvResponse, dateRange, findInOrg, idParam, qp } from '@/lib/crud';

/**
 * GET /api/admin/reports?type=occupancy|fees|complaints|attendance|inventory|expenses[&hostel][&from][&to][&format=csv]
 * Wardens get the operational reports for their hostels only; financial reports are admin-only.
 */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const type = qp(req, 'type') as ReportType | undefined;
  if (!type || !REPORT_TYPES.includes(type)) throw new ApiError(400, `type is required. Allowed: ${REPORT_TYPES.join(', ')}`);
  const hostel = idParam(req, 'hostel');
  if (hostel) await findInOrg(Hostel, auth, hostel, 'Hostel');
  const r = dateRange(req, 'd').d ?? {};
  const from = qp(req, 'from');
  const to = qp(req, 'to');
  const report = await buildReport(auth, type, { from: r.$gte, to: r.$lte, fromDay: from?.slice(0, 10), toDay: to?.slice(0, 10) }, hostel);
  if (qp(req, 'format') === 'csv') return csvResponse(`${type}-report.csv`, report.columns, report.rows);
  return ok(report);
});
