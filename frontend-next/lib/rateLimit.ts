import { NextRequest } from 'next/server';
import { ApiError, clientIp } from '@/lib/api';

/**
 * Fixed-window in-memory rate limiter. Suitable for a single instance / dev; for multi-instance
 * production replace the Map with a shared store (e.g. Upstash Redis) behind the same function signature.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: NextRequest, name: string, limit: number, windowMs: number, extraKey = ''): void {
  const now = Date.now();
  if (buckets.size > 10000) {
    buckets.forEach((v, k) => {
      if (v.reset < now) buckets.delete(k);
    });
  }
  const key = `${name}:${clientIp(req)}:${extraKey}`;
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    const retry = Math.ceil((b.reset - now) / 1000);
    throw new ApiError(429, `Too many requests. Try again in ${retry}s.`);
  }
}
