import { handler, ok, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { feeGenerateSchema } from '@/lib/validation';
import { FeeStructure, Hostel } from '@/lib/models';
import { generateFees } from '@/lib/services/fees';
import { assertRefs } from '@/lib/crud';
import { audit } from '@/lib/audit';

/** Generates one fee per actively-allocated student for a structure and period. Idempotent. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, feeGenerateSchema);
  await assertRefs(auth, [[FeeStructure, body.feeStructure, 'Fee structure'], [Hostel, body.hostel, 'Hostel']]);
  const result = await generateFees(auth.organizationId, { structureId: body.feeStructure, period: body.period, dueDate: body.dueDate, hostelId: body.hostel });
  await audit(auth, 'GENERATE', 'StudentFee', body.feeStructure, { period: body.period, ...result }, req);
  return ok(result, { status: result.created > 0 ? 201 : 200 });
});
