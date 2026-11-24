import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { visitorUpdateSchema } from '@/lib/validation';
import { Visitor } from '@/lib/models';
import { assertRecordAccess, defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const v = await findInOrg(Visitor, auth, params.id, 'Visitor');
  await assertRecordAccess(auth, v);
  await v.populate([{ path: 'student', select: 'name enrollmentNo' }, { path: 'hostel', select: 'name code' }]);
  return ok(v);
});

/** Record exit ({markExit:true} or exitTime) and/or update verification. */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const body = await parseBody(req, visitorUpdateSchema);
  const v = await findInOrg(Visitor, auth, params.id, 'Visitor');
  await assertRecordAccess(auth, v);
  const exit = body.exitTime ?? (body.markExit ? new Date() : undefined);
  if (exit) {
    if (v.exitTime) throw new ApiError(409, 'Exit already recorded');
    if (exit.getTime() < v.entryTime.getTime()) throw new ApiError(400, 'Exit time cannot be before entry time');
    if (exit.getTime() > Date.now() + 5 * 60 * 1000) throw new ApiError(400, 'Exit time cannot be in the future');
  }
  v.set(defined({ exitTime: exit, verificationStatus: body.verificationStatus }));
  await v.save();
  await audit(auth, exit ? 'EXIT' : 'UPDATE', 'Visitor', v._id, { verificationStatus: body.verificationStatus }, req);
  return ok(v);
});
