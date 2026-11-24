import { handler, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { Attendance } from '@/lib/models';
import { scoped } from '@/lib/services/scope';
import { attendanceFilter } from '@/lib/services/attendance';
import { csvResponse, idParam, roleScopedFilter } from '@/lib/crud';

/** CSV export of attendance (same filters as the list: hostel, student, date | month | from+to, status). */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const base: Record<string, any> = scoped(auth, attendanceFilter(req));
  if (!base.date) throw new ApiError(400, 'Provide date, month or from/to to export');
  const hostel = idParam(req, 'hostel');
  const student = idParam(req, 'student');
  if (hostel) base.hostel = hostel;
  if (student) base.student = student;
  const f = await roleScopedFilter(auth, base);
  const rows: any[] = await Attendance.find(f).sort({ date: 1 }).limit(50000).populate('student', 'name enrollmentNo').populate('hostel', 'name').lean();
  return csvResponse(
    'attendance.csv',
    [{ key: 'date', label: 'Date' }, { key: 'hostel', label: 'Hostel' }, { key: 'name', label: 'Student' }, { key: 'enrollmentNo', label: 'Enrollment No' }, { key: 'status', label: 'Status' }, { key: 'remarks', label: 'Remarks' }, { key: 'changes', label: 'Changes' }],
    rows.map((r) => ({ ...r, hostel: r.hostel?.name, name: r.student?.name, enrollmentNo: r.student?.enrollmentNo, changes: (r.history ?? []).length }))
  );
});
