import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { feeStructureUpdateSchema } from '@/lib/validation';
import { FeeStructure, Hostel, StudentFee } from '@/lib/models';
import { assertRefs, defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const fs = await findInOrg(FeeStructure, auth, params.id, 'Fee structure');
  await fs.populate({ path: 'hostel', select: 'name code' });
  return ok(fs);
});

/** Edits only affect fees generated afterwards; existing student fees keep their snapshot of items and amount. */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, feeStructureUpdateSchema);
  const fs = await findInOrg(FeeStructure, auth, params.id, 'Fee structure');
  if (body.hostel) await assertRefs(auth, [[Hostel, body.hostel, 'Hostel']]);
  fs.set(defined(body));
  await fs.save();
  await audit(auth, 'UPDATE', 'FeeStructure', fs._id, { fields: Object.keys(body) }, req);
  return ok(fs);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const fs = await findInOrg(FeeStructure, auth, params.id, 'Fee structure');
  if (await StudentFee.exists({ feeStructure: fs._id })) throw new ApiError(409, 'Fees were generated from this structure. Deactivate it instead of deleting.');
  await FeeStructure.deleteOne({ _id: fs._id });
  await audit(auth, 'DELETE', 'FeeStructure', fs._id, { name: fs.name }, req);
  return ok({ _id: fs._id, deleted: true });
});
