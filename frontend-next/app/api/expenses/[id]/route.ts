import { handler, ok, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { expenseSchema } from '@/lib/validation';
import { Expense, Hostel } from '@/lib/models';
import { assertRefs, defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const e = await findInOrg(Expense, auth, params.id, 'Expense');
  await e.populate('hostel', 'name code');
  return ok(e);
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, expenseSchema.partial());
  const e = await findInOrg(Expense, auth, params.id, 'Expense');
  await assertRefs(auth, [[Hostel, body.hostel, 'Hostel']]);
  e.set(defined(body));
  await e.save();
  await audit(auth, 'UPDATE', 'Expense', e._id, { fields: Object.keys(body) }, req);
  return ok(e);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const e = await findInOrg(Expense, auth, params.id, 'Expense');
  await Expense.deleteOne({ _id: e._id });
  await audit(auth, 'DELETE', 'Expense', e._id, { amount: e.amount }, req);
  return ok({ _id: e._id, deleted: true });
});
