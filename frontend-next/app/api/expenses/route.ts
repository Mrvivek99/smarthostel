import { handler, ok, parseBody, paginate } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { expenseSchema } from '@/lib/validation';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { Expense, Hostel } from '@/lib/models';
import { hostelScope, scoped } from '@/lib/services/scope';
import { castFilter } from '@/lib/services/query';
import { and, assertRefs, dateRange, enumParam, idParam } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  const category = enumParam(req, 'category', EXPENSE_CATEGORIES);
  if (hostel) filter.hostel = hostel;
  if (category) filter.category = category;
  const f = and(await hostelScope(auth, filter), dateRange(req, 'date'));
  const [byMonth, byCategory] = await Promise.all([
    Expense.aggregate([{ $match: castFilter(Expense, f) }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } }, { $sort: { _id: -1 } }, { $limit: 24 }]),
    Expense.aggregate([{ $match: castFilter(Expense, f) }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
  ]);
  return paginate(Expense, f, req, {
    sort: { date: -1 },
    populate: [{ path: 'hostel', select: 'name code' }],
    extraMeta: {
      totalAmount: byCategory.reduce((s: number, c: any) => s + c.total, 0),
      monthly: byMonth.map((m: any) => ({ month: m._id, total: m.total })),
      byCategory: byCategory.map((c: any) => ({ category: c._id, total: c.total })),
    },
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, expenseSchema);
  await assertRefs(auth, [[Hostel, body.hostel, 'Hostel']]);
  const e: any = await Expense.create({ ...body, organization: auth.organizationId, createdBy: auth.userId });
  await audit(auth, 'CREATE', 'Expense', e._id, { amount: body.amount, category: body.category }, req);
  return ok(e, { status: 201 });
});
