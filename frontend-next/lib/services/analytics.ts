import { Attendance, Bed, Building, Complaint, Expense, Hostel, Inventory, LeaveRequest, Payment, Room, Student, StudentFee, Warden } from '@/lib/models';
import { toObjectId } from '@/lib/crud';
import { lastMonths } from '@/lib/utils';
import { bedStatsByHostel } from '@/lib/services/hostels';
import { wardenHostelIds } from '@/lib/services/scope';
import { attendancePercentage } from '@/lib/services/attendance';
import { round2 } from '@/lib/services/feeMath';
import type { AuthContext } from '@/lib/auth/guard';

const PAID_STATES = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];
const oidList = (ids: string[]) => ids.map(toObjectId);

/** Fill month gaps so charts always show a continuous axis. */
function fillMonths<T extends { month: string }>(months: string[], rows: T[], blank: Omit<T, 'month'>): T[] {
  const m = new Map(rows.map((r) => [r.month, r]));
  return months.map((month) => m.get(month) ?? ({ month, ...blank } as T));
}

/** Hostel restriction for the caller: null = whole organization. */
export async function hostelRestriction(auth: AuthContext): Promise<string[] | null> {
  return auth.role === 'WARDEN' ? wardenHostelIds(auth) : null;
}

export async function dashboard(auth: AuthContext) {
  // SUPER_ADMIN has no tenant: aggregate across every organization.
  const orgF: Record<string, any> = auth.organizationId ? { organization: toObjectId(auth.organizationId) } : {};
  const orgStr: Record<string, any> = auth.organizationId ? { organization: auth.organizationId } : {};
  const hostels = await hostelRestriction(auth);
  const byHostel: Record<string, any> = hostels ? { hostel: { $in: oidList(hostels) } } : {};
  const orgHostel = { ...orgF, ...byHostel };
  const months = lastMonths(6);
  const since = new Date(`${months[0]}-01T00:00:00Z`);
  const showFinance = !hostels;

  const [totalStudents, totalWardens, totalHostels, totalBuildings, totalRooms, bedStats, pendingComplaints, activeLeaves, complaintsByStatus, regs, hostelDocs] = await Promise.all([
    Student.countDocuments({ ...orgF, status: { $ne: 'INACTIVE' }, ...byHostel }),
    Warden.countDocuments(hostels ? { ...orgF, hostels: { $in: oidList(hostels) } } : { ...orgF }),
    Hostel.countDocuments(hostels ? { ...orgF, _id: { $in: oidList(hostels) } } : { ...orgF }),
    Building.countDocuments(orgHostel),
    Room.countDocuments(orgHostel),
    bedStatsByHostel(auth.organizationId, hostels ?? undefined),
    Complaint.countDocuments({ ...orgHostel, status: { $in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] } }),
    LeaveRequest.countDocuments({ ...orgHostel, status: { $in: ['PENDING', 'APPROVED'] }, returnDate: { $gte: new Date() } }),
    Complaint.aggregate([{ $match: orgHostel }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Student.aggregate([{ $match: { ...orgF, createdAt: { $gte: since }, ...byHostel } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }]),
    Hostel.find(hostels ? { ...orgStr, _id: { $in: hostels } } : { ...orgStr }).select('name code').limit(auth.organizationId ? 0 : 25).lean(),
  ]);
  const bedTotals = Object.values(bedStats).reduce((a, b) => ({ total: a.total + b.total, occupied: a.occupied + b.occupied, available: a.available + b.available, maintenance: a.maintenance + b.maintenance }), { total: 0, occupied: 0, available: 0, maintenance: 0 });

  let finance: Record<string, any> = {};
  let monthlyCollection: any[] = [];
  let revenueComparison: any[] = [];
  let paymentStatus: any[] = [];
  if (showFinance) {
    const [pending, collected, monthly, expenses, pstatus] = await Promise.all([
      StudentFee.aggregate([{ $match: { ...orgF, status: { $in: ['PENDING', 'PARTIAL'] } } }, { $group: { _id: null, v: { $sum: { $max: [0, { $subtract: [{ $add: ['$amount', '$lateFee'] }, '$paidAmount'] }] } } } }]),
      Payment.aggregate([{ $match: { ...orgF, status: { $in: PAID_STATES } } }, { $group: { _id: null, v: { $sum: { $subtract: ['$amount', '$refundedAmount'] } } } }]),
      Payment.aggregate([
        { $match: { ...orgF, status: { $in: PAID_STATES }, paidAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, amount: { $sum: { $subtract: ['$amount', '$refundedAmount'] } } } },
      ]),
      Expense.aggregate([{ $match: { ...orgF, date: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, expenses: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { ...orgF } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const mm = new Map(monthly.map((r: any) => [r._id, r.amount]));
    const em = new Map(expenses.map((r: any) => [r._id, r.expenses]));
    monthlyCollection = months.map((month) => ({ month, amount: round2(mm.get(month) ?? 0) }));
    revenueComparison = months.map((month) => ({ month, revenue: round2(mm.get(month) ?? 0), expenses: round2(em.get(month) ?? 0) }));
    paymentStatus = pstatus.map((r: any) => ({ status: r._id, count: r.count }));
    finance = { pendingFees: round2(pending[0]?.v ?? 0), collectedFees: round2(collected[0]?.v ?? 0), monthlyRevenue: monthlyCollection[monthlyCollection.length - 1].amount };
  }

  return {
    stats: {
      totalStudents, totalWardens, totalHostels, totalBuildings, totalRooms,
      totalBeds: bedTotals.total, occupiedBeds: bedTotals.occupied, availableBeds: bedTotals.available, maintenanceBeds: bedTotals.maintenance,
      pendingComplaints, activeLeaves, ...finance,
    },
    charts: {
      monthlyCollection,
      occupancy: hostelDocs.map((h: any) => ({ hostel: h.name, occupied: bedStats[String(h._id)]?.occupied ?? 0, available: bedStats[String(h._id)]?.available ?? 0 })),
      registrations: fillMonths(months, regs.map((r: any) => ({ month: r._id, count: r.count })), { count: 0 }),
      complaints: complaintsByStatus.map((r: any) => ({ status: r._id, count: r.count })),
      revenueComparison,
      paymentStatus,
    },
  };
}

type Report = { columns: { key: string; label: string }[]; rows: Record<string, any>[]; summary?: Record<string, any> };
export const REPORT_TYPES = ['occupancy', 'fees', 'complaints', 'attendance', 'inventory', 'expenses'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export async function buildReport(auth: AuthContext, type: ReportType, range: { from?: Date; to?: Date; fromDay?: string; toDay?: string }, hostelId?: string): Promise<Report> {
  const org = toObjectId(auth.organizationId);
  const restricted = await hostelRestriction(auth);
  const allowed = restricted ? (hostelId ? restricted.filter((h) => h === hostelId) : restricted) : hostelId ? [hostelId] : null;
  const hostelMatch: Record<string, any> = allowed ? { hostel: { $in: oidList(allowed) } } : {};
  const hostelDocs: any[] = await Hostel.find({ organization: auth.organizationId, ...(allowed ? { _id: { $in: allowed } } : {}) }).select('name').lean();
  const hostelName = new Map(hostelDocs.map((h) => [String(h._id), h.name]));
  const dateRange = (f: string) => (range.from || range.to ? { [f]: { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) } } : {});

  if (type === 'occupancy') {
    const stats = await bedStatsByHostel(auth.organizationId, allowed ?? undefined);
    const rows = hostelDocs.map((h) => {
      const s = stats[String(h._id)] ?? { total: 0, occupied: 0, available: 0, maintenance: 0 };
      return { hostel: h.name, ...s, occupancyPct: s.total ? round2((s.occupied / s.total) * 100) : 0 };
    });
    return { columns: [['hostel', 'Hostel'], ['total', 'Beds'], ['occupied', 'Occupied'], ['available', 'Available'], ['maintenance', 'Maintenance'], ['occupancyPct', 'Occupancy %']].map(([key, label]) => ({ key, label })), rows, summary: { beds: rows.reduce((a, r) => a + r.total, 0), occupied: rows.reduce((a, r) => a + r.occupied, 0) } };
  }

  if (type === 'complaints') {
    const agg: any[] = await Complaint.aggregate([
      { $match: { organization: org, ...hostelMatch, ...dateRange('createdAt') } },
      { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 }, avgHours: { $avg: { $cond: [{ $ifNull: ['$resolvedAt', false] }, { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] }, null] } } } },
      { $sort: { '_id.category': 1, '_id.status': 1 } },
    ]);
    const rows = agg.map((r) => ({ category: r._id.category, status: r._id.status, count: r.count, avgResolutionHours: r.avgHours == null ? '' : round2(r.avgHours) }));
    return { columns: [['category', 'Category'], ['status', 'Status'], ['count', 'Complaints'], ['avgResolutionHours', 'Avg resolution (h)']].map(([key, label]) => ({ key, label })), rows, summary: { total: rows.reduce((a, r) => a + r.count, 0) } };
  }

  if (type === 'attendance') {
    const day: Record<string, any> = range.fromDay || range.toDay ? { date: { ...(range.fromDay ? { $gte: range.fromDay } : {}), ...(range.toDay ? { $lte: range.toDay } : {}) } } : {};
    const agg: any[] = await Attendance.aggregate([
      { $match: { organization: org, ...hostelMatch, ...day } },
      { $group: { _id: { student: '$student', hostel: '$hostel' }, present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } }, onLeave: { $sum: { $cond: [{ $eq: ['$status', 'ON_LEAVE'] }, 1, 0] } } } },
    ]);
    const students: any[] = await Student.find({ _id: { $in: agg.map((a) => a._id.student) } }).select('name enrollmentNo').lean();
    const sm = new Map(students.map((s) => [String(s._id), s]));
    const rows = agg
      .map((a) => ({ hostel: hostelName.get(String(a._id.hostel)) ?? '', student: sm.get(String(a._id.student))?.name ?? '', enrollmentNo: sm.get(String(a._id.student))?.enrollmentNo ?? '', present: a.present, absent: a.absent, onLeave: a.onLeave, percentage: attendancePercentage(a.present, a.absent) }))
      .sort((x, y) => x.percentage - y.percentage);
    return { columns: [['hostel', 'Hostel'], ['student', 'Student'], ['enrollmentNo', 'Enrollment No'], ['present', 'Present'], ['absent', 'Absent'], ['onLeave', 'On leave'], ['percentage', 'Attendance %']].map(([key, label]) => ({ key, label })), rows, summary: { students: rows.length } };
  }

  if (type === 'inventory') {
    const agg: any[] = await Inventory.aggregate([
      { $match: { organization: org, ...hostelMatch } },
      { $group: { _id: { hostel: '$hostel', category: '$category', condition: '$condition' }, items: { $sum: 1 }, quantity: { $sum: '$quantity' } } },
      { $sort: { '_id.category': 1 } },
    ]);
    const rows = agg.map((r) => ({ hostel: hostelName.get(String(r._id.hostel)) ?? '', category: r._id.category, condition: r._id.condition, items: r.items, quantity: r.quantity }));
    return { columns: [['hostel', 'Hostel'], ['category', 'Category'], ['condition', 'Condition'], ['items', 'Items'], ['quantity', 'Quantity']].map(([key, label]) => ({ key, label })), rows, summary: { quantity: rows.reduce((a, r) => a + r.quantity, 0) } };
  }

  // fees & expenses are organization-level finance
  if (restricted) {
    const { ApiError } = await import('@/lib/api');
    throw new ApiError(403, 'You do not have permission to view financial reports');
  }
  if (type === 'expenses') {
    const agg: any[] = await Expense.aggregate([
      { $match: { organization: org, ...hostelMatch, ...dateRange('date') } },
      { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, hostel: '$hostel', category: '$category' }, total: { $sum: '$amount' } } },
      { $sort: { '_id.month': -1 } },
    ]);
    const rows = agg.map((r) => ({ month: r._id.month, hostel: hostelName.get(String(r._id.hostel)) ?? '', category: r._id.category, total: round2(r.total) }));
    return { columns: [['month', 'Month'], ['hostel', 'Hostel'], ['category', 'Category'], ['total', 'Amount']].map(([key, label]) => ({ key, label })), rows, summary: { total: round2(rows.reduce((a, r) => a + r.total, 0)) } };
  }

  // fees: outstanding per student
  const fees: any[] = await StudentFee.aggregate([
    { $match: { organization: org, ...hostelMatch, status: { $in: ['PENDING', 'PARTIAL', 'PAID'] }, ...dateRange('dueDate') } },
    { $group: { _id: '$student', billed: { $sum: { $add: ['$amount', '$lateFee'] } }, paid: { $sum: '$paidAmount' }, overdue: { $sum: { $cond: [{ $and: [{ $in: ['$status', ['PENDING', 'PARTIAL']] }, { $lt: ['$dueDate', new Date()] }] }, 1, 0] } } } },
  ]);
  const studs: any[] = await Student.find({ _id: { $in: fees.map((f) => f._id) } }).select('name enrollmentNo hostel').lean();
  const sm = new Map(studs.map((s) => [String(s._id), s]));
  const rows = fees
    .map((f) => ({ student: sm.get(String(f._id))?.name ?? '', enrollmentNo: sm.get(String(f._id))?.enrollmentNo ?? '', billed: round2(f.billed), paid: round2(f.paid), outstanding: Math.max(0, round2(f.billed - f.paid)), overdueFees: f.overdue }))
    .sort((a, b) => b.outstanding - a.outstanding);
  return { columns: [['student', 'Student'], ['enrollmentNo', 'Enrollment No'], ['billed', 'Billed'], ['paid', 'Paid'], ['outstanding', 'Outstanding'], ['overdueFees', 'Overdue fees']].map(([key, label]) => ({ key, label })), rows, summary: { billed: round2(rows.reduce((a, r) => a + r.billed, 0)), paid: round2(rows.reduce((a, r) => a + r.paid, 0)), outstanding: round2(rows.reduce((a, r) => a + r.outstanding, 0)) } };
}

export async function revenueReport(orgId: string, months: number, hostelId?: string) {
  const org = toObjectId(orgId);
  const keys = lastMonths(months);
  const since = new Date(`${keys[0]}-01T00:00:00Z`);
  const feeHostel = hostelId ? [{ $lookup: { from: 'studentfees', localField: 'fee', foreignField: '_id', as: 'f' } }, { $match: { 'f.hostel': toObjectId(hostelId) } }] : [];
  const [paid, refunds, methods, expenses, outstanding] = await Promise.all([
    Payment.aggregate([{ $match: { organization: org, status: { $in: PAID_STATES }, paidAt: { $gte: since } } }, ...feeHostel, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { organization: org, refundedAmount: { $gt: 0 }, paidAt: { $gte: since } } }, ...feeHostel, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, refunds: { $sum: '$refundedAmount' } } }]),
    Payment.aggregate([{ $match: { organization: org, status: { $in: PAID_STATES }, paidAt: { $gte: since } } }, ...feeHostel, { $group: { _id: { $ifNull: ['$method', 'unknown'] }, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Expense.aggregate([{ $match: { organization: org, date: { $gte: since }, ...(hostelId ? { hostel: toObjectId(hostelId) } : {}) } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, expenses: { $sum: '$amount' } } }]),
    StudentFee.aggregate([{ $match: { organization: org, status: { $in: ['PENDING', 'PARTIAL'] }, ...(hostelId ? { hostel: toObjectId(hostelId) } : {}) } }, { $group: { _id: null, v: { $sum: { $max: [0, { $subtract: [{ $add: ['$amount', '$lateFee'] }, '$paidAmount'] }] } } } }]),
  ]);
  const g = (rows: any[], k: string) => new Map(rows.map((r) => [r._id, r[k]]));
  const pm = g(paid, 'revenue'), pc = g(paid, 'count'), rm = g(refunds, 'refunds'), em = g(expenses, 'expenses');
  const series = keys.map((month) => {
    const revenue = round2(pm.get(month) ?? 0), refunded = round2(rm.get(month) ?? 0), exp = round2(em.get(month) ?? 0);
    return { month, revenue, refunds: refunded, net: round2(revenue - refunded), expenses: exp, profit: round2(revenue - refunded - exp), payments: pc.get(month) ?? 0 };
  });
  const sum = (k: keyof (typeof series)[number]) => round2(series.reduce((a, r) => a + (r[k] as number), 0));
  return {
    series,
    totals: { revenue: sum('revenue'), refunds: sum('refunds'), net: sum('net'), expenses: sum('expenses'), profit: sum('profit'), payments: sum('payments'), outstanding: round2(outstanding[0]?.v ?? 0) },
    byMethod: methods.map((m: any) => ({ method: m._id, total: round2(m.total), count: m.count })),
  };
}
