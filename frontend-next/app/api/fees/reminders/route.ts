import { handler, ok } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { sendFeeReminders } from '@/lib/services/fees';
import { audit } from '@/lib/audit';

/** Sends in-app reminders for overdue / soon-due fees (at most one per fee per ~day). */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const days = Math.min(30, Math.max(0, parseInt(req.nextUrl.searchParams.get('days') ?? '3', 10) || 3));
  const result = await sendFeeReminders(auth.organizationId, days);
  await audit(auth, 'REMIND', 'StudentFee', undefined, result, req);
  return ok(result);
});
