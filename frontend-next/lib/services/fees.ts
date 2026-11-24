import { ApiError } from '@/lib/api';
import { FeeStructure, RoomAllocation, Student, StudentFee } from '@/lib/models';
import { computeBalance, computeLateFee, round2 } from '@/lib/services/feeMath';
import { notify } from '@/lib/services/notify';

/** Adds computed `lateFee`, `balance` and `overdue` to a lean StudentFee. */
export function presentFee(f: any, now = new Date()) {
  const closed = f.status === 'PAID' || f.status === 'CANCELLED';
  const lateFee = closed ? f.lateFee ?? 0 : Math.max(f.lateFee ?? 0, computeLateFee(f.dueDate, now, f.lateFeePerDay ?? 0));
  const balance = f.status === 'CANCELLED' ? 0 : computeBalance(f.amount, lateFee, f.paidAmount ?? 0);
  const overdue = balance > 0 && new Date(f.dueDate) < now;
  return { ...f, lateFee, balance, overdue };
}

function dueDateFor(period: string, dueDay: number, explicit?: Date): Date {
  if (explicit) return explicit;
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, dueDay, 18, 29, 59)); // end of day IST
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d;
}

/** Generates one StudentFee per eligible (actively allocated) student. Safe to re-run: duplicates are skipped by a unique index. */
export async function generateFees(orgId: string, p: { structureId: string; period: string; dueDate?: Date; hostelId?: string }) {
  const structure: any = await FeeStructure.findOne({ _id: p.structureId, organization: orgId, isActive: true }).lean();
  if (!structure) throw new ApiError(404, 'Active fee structure not found');
  if (structure.frequency === 'MONTHLY' && !/^\d{4}-\d{2}$/.test(p.period)) throw new ApiError(400, 'Monthly structures need a period like 2026-11');
  const hostelId = p.hostelId ?? (structure.hostel ? String(structure.hostel) : undefined);
  if (structure.hostel && p.hostelId && String(structure.hostel) !== p.hostelId) throw new ApiError(400, 'Fee structure belongs to a different hostel');

  const allocs: any[] = await RoomAllocation.find({ organization: orgId, status: 'ACTIVE', ...(hostelId ? { hostel: hostelId } : {}) })
    .populate('room', 'type')
    .select('student hostel room')
    .lean();
  const targets = allocs.filter((a) => !structure.roomType || a.room?.type === structure.roomType);
  if (!targets.length) return { targeted: 0, created: 0, skipped: 0 };

  const total = round2(structure.items.reduce((s: number, i: any) => s + i.amount, 0));
  const dueDate = dueDateFor(p.period, structure.dueDay, p.dueDate);
  const title = `${structure.name} - ${p.period}`;
  const result = await StudentFee.bulkWrite(
    targets.map((a) => ({
      updateOne: {
        filter: { organization: orgId, student: a.student, feeStructure: structure._id, period: p.period },
        update: {
          $setOnInsert: {
            hostel: a.hostel,
            title,
            items: structure.items,
            amount: total,
            lateFeePerDay: structure.lateFeePerDay,
            allowPartial: structure.allowPartial,
            paidAmount: 0,
            lateFee: 0,
            dueDate,
            status: 'PENDING',
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  const insertedIdx = Object.keys(result.upsertedIds ?? {}).map(Number);
  const created = result.upsertedCount ?? insertedIdx.length;
  if (created > 0) {
    const studentIds = insertedIdx.map((i) => targets[i]?.student).filter(Boolean);
    const students: any[] = await Student.find({ _id: { $in: studentIds } }).select('user').lean();
    await notify(orgId, students.map((s) => s.user), {
      type: 'FEE',
      title: 'New fee generated',
      message: `${title}: Rs. ${total} due by ${dueDate.toLocaleDateString('en-IN')}.`,
      link: '/student/fees',
    });
  }
  return { targeted: targets.length, created, skipped: targets.length - created };
}

/** Sends reminders for unpaid fees that are overdue or due within `withinDays`. */
export async function sendFeeReminders(orgId: string, withinDays = 3) {
  const horizon = new Date(Date.now() + withinDays * 86400000);
  const cutoff = new Date(Date.now() - 20 * 3600 * 1000); // at most one reminder per ~day
  const fees: any[] = await StudentFee.find({
    organization: orgId,
    status: { $in: ['PENDING', 'PARTIAL'] },
    dueDate: { $lte: horizon },
    $or: [{ lastReminderAt: { $exists: false } }, { lastReminderAt: { $lt: cutoff } }],
  })
    .limit(2000)
    .lean();
  if (!fees.length) return { reminded: 0 };
  const students: any[] = await Student.find({ _id: { $in: fees.map((f) => f.student) } }).select('user').lean();
  const userOf = new Map(students.map((s) => [String(s._id), s.user]));
  for (const f of fees) {
    const pf = presentFee(f);
    await notify(orgId, [userOf.get(String(f.student))], {
      type: 'FEE',
      title: pf.overdue ? 'Fee overdue' : 'Fee due soon',
      message: `${f.title}: Rs. ${pf.balance} ${pf.overdue ? 'was due on' : 'is due on'} ${new Date(f.dueDate).toLocaleDateString('en-IN')}.`,
      link: '/student/fees',
    });
  }
  await StudentFee.updateMany({ _id: { $in: fees.map((f) => f._id) } }, { lastReminderAt: new Date() });
  return { reminded: fees.length };
}
