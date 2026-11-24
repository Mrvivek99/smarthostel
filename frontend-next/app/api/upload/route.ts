import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { uploadSchema } from '@/lib/validation';
import { signUpload } from '@/lib/services/cloudinary';
import { rateLimit } from '@/lib/rateLimit';

/** Returns server-signed Cloudinary direct-upload parameters scoped to the caller's organization folder. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  if (!auth.organizationId) throw new ApiError(403, 'This action requires an organization context');
  rateLimit(req, 'upload:sign', 60, 60 * 60 * 1000, auth.userId);
  const body = await parseBody(req, uploadSchema);
  return ok(signUpload(auth.organizationId, body.folder));
});
