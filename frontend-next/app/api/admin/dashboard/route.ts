import { handler, ok } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { dashboard } from '@/lib/services/analytics';

/** SUPER_ADMIN: platform-wide (all organizations). ADMIN: organization-wide stats + chart series. WARDEN: same shape scoped to assigned hostels (finance omitted). */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['SUPER_ADMIN', 'ADMIN', 'WARDEN']);
  return ok(await dashboard(auth));
});
