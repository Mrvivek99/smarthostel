import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api';
import { ATTENDANCE_STATUSES } from '@/lib/constants';
import { Attendance, LeaveRequest, RoomAllocation } from '@/lib/models';
import { todayStr } from '@/lib/utils';
import { enumParam, qp, toObjectId } from '@/lib/crud';
import { castFilter } from '@/lib/services/query';

/** Percentage of attended days among counted days; ON_LEAVE days are excused (excluded). */
export function attendancePercentage(present: number, absent: number): number {
  const d = present + absent;
  return d === 0 ? 0 : Math.round((present / d) * 1000) / 10;
}

export async function attendanceSummary(filter: Record<string, any>) {
  const rows: any[] = await Attendance.aggregate([{ $match: castFilter(Attendance, filter) }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const c = (s: string) => rows.find((r) => r._id === s)?.n ?? 0;
  const present = c('PRESENT'), absent = c('ABSENT'), onLeave = c('ON_LEAVE');
  return { present, absent, onLeave, total: present + absent + onLeave, percentage: attendancePercentage(present, absent) };
}

const DAY = 86400000;
export const WARDEN_EDIT_WINDOW_DAYS = 7;

/** Validates a marking date: YYYY-MM-DD, never in the future, wardens limited to a recent window. */
export function assertMarkableDate(date: string, role: string, now = new Date()) {
  const today = todayStr(now);
  if (date > today) throw new ApiError(400, 'Attendance cannot be marked for a future date');
  if (role === 'WARDEN') {
    const diff = Math.round((Date.parse(today) - Date.parse(date)) / DAY);
    if (diff > WARDEN_EDIT_WINDOW_DAYS) throw new ApiError(403, `Wardens can only mark or change attendance within the last ${WARDEN_EDIT_WINDOW_DAYS} days. Ask an admin.`);
  }
}

/** Students currently allocated to a hostel, with leave approved for the date. */
export async function rosterFor(orgId: string, hostelId: string, date: string) {
  const allocs: any[] = await RoomAllocation.find({ organization: orgId, hostel: hostelId, status: 'ACTIVE' })
    .populate('student', 'name email enrollmentNo')
    .populate('room', 'roomNumber')
    .populate('bed', 'bedNumber')
    .lean();
  const ids = allocs.map((a) => a.student?._id).filter(Boolean);
  const day = new Date(`${date}T12:00:00Z`);
  const [marks, leaves] = await Promise.all([
    Attendance.find({ organization: orgId, hostel: hostelId, date, student: { $in: ids } }).lean(),
    LeaveRequest.find({ organization: orgId, student: { $in: ids }, status: 'APPROVED', departureDate: { $lte: new Date(day.getTime() + 12 * 3600000) }, returnDate: { $gte: new Date(day.getTime() - 12 * 3600000) } }).select('student').lean(),
  ]);
  const markOf = new Map(marks.map((m: any) => [String(m.student), m]));
  const onLeave = new Set(leaves.map((l: any) => String(l.student)));
  return allocs
    .filter((a) => a.student)
    .map((a) => {
      const m: any = markOf.get(String(a.student._id));
      return {
        student: a.student,
        room: a.room?.roomNumber,
        bed: a.bed?.bedNumber,
        status: m?.status,
        remarks: m?.remarks,
        marked: Boolean(m),
        suggestedStatus: m?.status ?? (onLeave.has(String(a.student._id)) ? 'ON_LEAVE' : undefined),
        approvedLeave: onLeave.has(String(a.student._id)),
      };
    })
    .sort((x, y) => String(x.student.name).localeCompare(String(y.student.name)));
}
export { toObjectId };

export function attendanceFilter(req: NextRequest): Record<string, any> {
  const f: Record<string, any> = {};
  const date = qp(req, 'date');
  const month = qp(req, 'month');
  const from = qp(req, 'from');
  const to = qp(req, 'to');
  const day = /^\d{4}-\d{2}-\d{2}$/;
  for (const [k, v] of [['date', date], ['from', from], ['to', to]] as const) if (v && !day.test(v)) throw new ApiError(400, `${k} must be YYYY-MM-DD`);
  if (month && !/^\d{4}-\d{2}$/.test(month)) throw new ApiError(400, 'month must be YYYY-MM');
  if (date) f.date = date;
  else if (month) f.date = { $gte: `${month}-01`, $lte: `${month}-31` };
  else if (from || to) f.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const status = enumParam(req, 'status', ATTENDANCE_STATUSES);
  if (status) f.status = status;
  return f;
}

