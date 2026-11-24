import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { roomChangeSchema } from '@/lib/validation';
import { studentOf } from '@/lib/services/scope';
import { notify } from '@/lib/services/notify';
import { adminUserIds, wardenUserIds } from '@/lib/services/recipients';
import { rateLimit } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

/** Student asks for a room change; admins and the hostel's wardens are notified (admin then transfers via PATCH /api/allocations/[id]). */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['STUDENT']);
  rateLimit(req, 'room-change', 5, 24 * 60 * 60 * 1000, auth.userId);
  const body = await parseBody(req, roomChangeSchema);
  const me = await studentOf(auth);
  if (!me.hostel || !me.bed) throw new ApiError(409, 'You do not have an active room allocation');
  const recipients = [...(await adminUserIds(auth.organizationId)), ...(await wardenUserIds(auth.organizationId, me.hostel))];
  await notify(auth.organizationId, recipients, {
    type: 'ALLOCATION',
    title: 'Room change request',
    message: `${me.name} requested a room change${body.preferredRoomType ? ` (prefers ${body.preferredRoomType.toLowerCase()})` : ''}: ${body.reason}`,
    link: `/students/${me._id}`,
  });
  await audit(auth, 'ROOM_CHANGE_REQUEST', 'Student', me._id, { reason: body.reason, preferredRoomType: body.preferredRoomType }, req);
  return ok({ requested: true }, { status: 201 });
});
