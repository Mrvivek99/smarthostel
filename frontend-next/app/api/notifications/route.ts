import { handler, ok, parseBody, getPaging } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { notificationsReadSchema } from '@/lib/validation';
import { Notification } from '@/lib/models';
import { boolParam } from '@/lib/crud';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req);
  const { page, limit, skip } = getPaging(req, 20, 100);
  const filter: Record<string, any> = { user: auth.userId };
  if (boolParam(req, 'unread')) filter.isRead = false;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: auth.userId, isRead: false }),
  ]);
  return ok(items, { meta: { page, limit, total, unread } });
});

/** PATCH { ids?: [...], all?: true } marks the caller's notifications read. */
export const PATCH = handler(async (req) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, notificationsReadSchema);
  const filter: Record<string, any> = { user: auth.userId, isRead: false };
  if (!body.all) filter._id = { $in: body.ids ?? [] };
  const r = await Notification.updateMany(filter, { isRead: true, readAt: new Date() });
  return ok({ updated: r.modifiedCount });
});
