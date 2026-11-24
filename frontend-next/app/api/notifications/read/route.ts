import { handler, ok, parseBody } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { notificationsReadSchema } from '@/lib/validation';
import { Notification } from '@/lib/models';

/** POST { all: true } or { ids: [...] } (alias of PATCH /api/notifications used by the portal's bell). */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, notificationsReadSchema);
  const filter: Record<string, any> = { user: auth.userId, isRead: false };
  if (!body.all) filter._id = { $in: body.ids ?? [] };
  const r = await Notification.updateMany(filter, { isRead: true, readAt: new Date() });
  return ok({ updated: r.modifiedCount });
});
