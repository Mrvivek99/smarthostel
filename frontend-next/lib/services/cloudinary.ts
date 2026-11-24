import crypto from 'crypto';
import { ApiError } from '@/lib/api';

export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,pdf';

/** Server-signed direct upload parameters. The API secret never leaves the server. */
export function signUpload(orgId: string, folder: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !secret) throw new ApiError(503, 'File uploads are not configured on this server');

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = { allowed_formats: ALLOWED_FORMATS, folder: `smarthostel/${orgId}/${folder}`, timestamp };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = crypto.createHash('sha1').update(toSign + secret).digest('hex');
  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: params.folder as string,
    allowedFormats: ALLOWED_FORMATS,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    maxBytes: 5 * 1024 * 1024,
  };
}
