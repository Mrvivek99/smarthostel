import { handler, ok, parseBody, getPaging } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { noticeSchema } from '@/lib/validation';
import { Hostel, Notice, Student, Warden } from '@/lib/models';
import { assertHostelAccess, scoped } from '@/lib/services/scope';
import { noticeVisibility } from '@/lib/services/notices';
import { notify } from '@/lib/services/notify';
import { and, assertRefs, boolParam, idParam, qp, searchFilter } from '@/lib/crud';
import { ApiError } from '@/lib/api';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const { page, limit, skip } = getPaging(req, 20, 100);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostel = hostel;
  const f = and(filter, await noticeVisibility(auth, auth.role !== 'STUDENT' && boolParam(req, 'includeExpired') === true), searchFilter(qp(req, 'q'), ['title', 'body']));
  const [items, total] = await Promise.all([
    Notice.find(f).sort({ pinned: -1, publishedAt: -1 }).skip(skip).limit(limit).populate('hostel', 'name code').lean(),
    Notice.countDocuments(f),
  ]);
  const data = items.map(({ readBy, ...n }: any) => ({ ...n, isRead: (readBy ?? []).some((u: any) => String(u) === auth.userId), readCount: auth.role === 'ADMIN' ? (readBy ?? []).length : undefined }));
  return ok(data, { meta: { page, limit, total } });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN']);
  const body = await parseBody(req, noticeSchema);
  if (auth.role === 'WARDEN') {
    if (!body.hostel) throw new ApiError(400, 'Wardens must choose one of their hostels for a notice');
    await assertHostelAccess(auth, body.hostel);
  }
  await assertRefs(auth, [[Hostel, body.hostel, 'Hostel']]);
  const n: any = await Notice.create({ ...body, organization: auth.organizationId, author: auth.userId, authorName: auth.name });

  const targetFilter = { organization: auth.organizationId, ...(body.hostel ? { hostel: body.hostel } : {}) };
  const userIds: unknown[] = [];
  if (body.audience !== 'WARDENS') userIds.push(...(await Student.find({ ...targetFilter, status: 'ACTIVE' }).select('user').limit(5000).lean()).map((s: any) => s.user));
  if (body.audience !== 'STUDENTS') {
    const wf: Record<string, any> = { organization: auth.organizationId, ...(body.hostel ? { hostels: body.hostel } : {}) };
    userIds.push(...(await Warden.find(wf).select('user').lean()).map((w: any) => w.user));
  }
  await notify(auth.organizationId, userIds.filter((u) => String(u) !== auth.userId), { type: 'NOTICE', title: body.title, message: body.body.slice(0, 160), link: '/notices' });
  await audit(auth, 'CREATE', 'Notice', n._id, { title: body.title, audience: body.audience }, req);
  return ok(n, { status: 201 });
});
