import { z } from 'zod';
import { handler, ok, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { noticeSchema } from '@/lib/validation';
import { Notice } from '@/lib/models';
import { noticeVisibility } from '@/lib/services/notices';
import { assertHostelAccess } from '@/lib/services/scope';
import { defined, findInOrg } from '@/lib/crud';
import { parseBody } from '@/lib/api';
import { audit } from '@/lib/audit';

const patchSchema = noticeSchema.partial().extend({ read: z.literal(true).optional() });

async function visibleNotice(req: any, auth: any, id: string) {
  const n = await findInOrg(Notice, auth, id, 'Notice');
  const ok = await Notice.exists({ $and: [{ _id: n._id }, await noticeVisibility(auth, auth.role !== 'STUDENT')] });
  if (!ok) throw new ApiError(404, 'Notice not found');
  return n;
}

function assertCanManage(auth: any, n: any) {
  if (auth.role === 'ADMIN') return;
  if (auth.role === 'WARDEN' && String(n.author) === auth.userId) return;
  throw new ApiError(403, 'You can only manage notices you published');
}

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const n = await visibleNotice(req, auth, params.id);
  await n.populate('hostel', 'name code');
  return ok(n);
});

/** `{ read: true }` marks the notice read for the caller; other fields edit it (admin or the warden who published it). */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const { read, ...edit } = await parseBody(req, patchSchema);
  const n = await visibleNotice(req, auth, params.id);
  if (read) await Notice.updateOne({ _id: n._id }, { $addToSet: { readBy: auth.userId } });
  if (Object.keys(edit).length) {
    assertCanManage(auth, n);
    if (auth.role === 'WARDEN' && edit.hostel) await assertHostelAccess(auth, edit.hostel);
    n.set(defined(edit));
    await n.save();
    await audit(auth, 'UPDATE', 'Notice', n._id, { fields: Object.keys(edit) }, req);
  }
  return ok({ _id: n._id, ...(read ? { isRead: true } : {}) });
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const n = await visibleNotice(req, auth, params.id);
  assertCanManage(auth, n);
  await Notice.deleteOne({ _id: n._id });
  await audit(auth, 'DELETE', 'Notice', n._id, { title: n.title }, req);
  return ok({ _id: n._id, deleted: true });
});
