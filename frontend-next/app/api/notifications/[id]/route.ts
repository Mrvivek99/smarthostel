import { z } from 'zod';
import { handler, ok, parseBody, ApiError, oid } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { Notification } from '@/lib/models';

const schema = z.object({ isRead: z.boolean().default(true) });

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, schema);
  const n: any = await Notification.findOneAndUpdate({ _id: oid(params.id), user: auth.userId }, { isRead: body.isRead, readAt: body.isRead ? new Date() : undefined }, { new: true });
  if (!n) throw new ApiError(404, 'Notification not found');
  return ok(n);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req);
  const r = await Notification.deleteOne({ _id: oid(params.id), user: auth.userId });
  if (!r.deletedCount) throw new ApiError(404, 'Notification not found');
  return ok({ _id: params.id, deleted: true });
});
