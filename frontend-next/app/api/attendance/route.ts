import { handler, ok, parseBody, getPaging, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { attendanceMarkSchema } from '@/lib/validation';
import { Attendance, Hostel, RoomAllocation } from '@/lib/models';
import { assertHostelAccess, scoped } from '@/lib/services/scope';
import { assertMarkableDate, attendanceFilter, attendanceSummary } from '@/lib/services/attendance';
import { assertRefs, idParam, roleScopedFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const { page, limit, skip } = getPaging(req, 50, 500);
  const base: Record<string, any> = scoped(auth, attendanceFilter(req));
  const hostel = idParam(req, 'hostel');
  const student = idParam(req, 'student');
  if (hostel) base.hostel = hostel;
  if (student && auth.role !== 'STUDENT') base.student = student;
  const f = await roleScopedFilter(auth, base);
  const select = auth.role === 'STUDENT' ? '-history -markedBy' : undefined;
  const [items, total, summary] = await Promise.all([
    Attendance.find(f).select(select ?? '').sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).populate('student', 'name enrollmentNo').populate('markedBy', 'name').lean(),
    Attendance.countDocuments(f),
    attendanceSummary(f),
  ]);
  return ok(items, { meta: { page, limit, total, summary } });
});

/** Bulk mark/update a day's attendance. Every change to an existing record is appended to its audit trail. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const body = await parseBody(req, attendanceMarkSchema);
  await assertHostelAccess(auth, body.hostel);
  await assertRefs(auth, [[Hostel, body.hostel, 'Hostel']]);
  assertMarkableDate(body.date, auth.role);

  const latest = new Map(body.records.map((r) => [r.student, r])); // duplicate rows: last wins
  const ids = Array.from(latest.keys());
  const placed: any[] = await RoomAllocation.find({ organization: auth.organizationId, hostel: body.hostel, student: { $in: ids } })
    .select('student status checkInDate checkOutDate')
    .lean();
  const activeNow = new Set(placed.filter((a) => a.status === 'ACTIVE').map((a) => String(a.student)));
  const existing: any[] = await Attendance.find({ organization: auth.organizationId, date: body.date, student: { $in: ids } }).lean();
  const existingOf = new Map(existing.map((e) => [String(e.student), e]));
  // A student may only be marked in a hostel they live in (or, for corrections to an existing mark, one already recorded).
  const bad = ids.filter((id) => !activeNow.has(id) && !(existingOf.get(id) && String(existingOf.get(id).hostel) === body.hostel));
  if (bad.length) throw new ApiError(400, `${bad.length} student(s) are not allocated to this hostel`, { students: bad });

  const ops: any[] = [];
  let created = 0, updated = 0, unchanged = 0;
  for (const r of latest.values()) {
    const prev = existingOf.get(r.student);
    if (!prev) {
      created++;
      ops.push({ insertOne: { document: { organization: auth.organizationId, hostel: body.hostel, student: r.student, date: body.date, status: r.status, remarks: r.remarks, markedBy: auth.userId, history: [] } } });
    } else if (prev.status !== r.status || (r.remarks !== undefined && r.remarks !== prev.remarks)) {
      updated++;
      ops.push({
        updateOne: {
          filter: { _id: prev._id },
          update: {
            $set: { status: r.status, remarks: r.remarks ?? prev.remarks, markedBy: auth.userId },
            ...(prev.status !== r.status ? { $push: { history: { from: prev.status, to: r.status, by: auth.userId, at: new Date() } } } : {}),
          },
        },
      });
    } else unchanged++;
  }
  if (ops.length) await Attendance.bulkWrite(ops, { ordered: false });
  await audit(auth, updated ? 'UPDATE' : 'MARK', 'Attendance', undefined, { hostel: body.hostel, date: body.date, created, updated, unchanged }, req);
  return ok({ created, updated, unchanged }, { status: created ? 201 : 200 });
});
