import { NextRequest, NextResponse } from 'next/server';
import { adminOrigins } from '@/lib/env';

/**
 * CORS for the admin SPA (ADMIN_ORIGIN, comma separated). Credentials are allowed so the httpOnly cookie
 * works cross-origin; origins are matched exactly (never reflected blindly, never "*").
 * Same-origin requests (the Next.js pages) carry no Origin header or the same origin and are untouched.
 */
const METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
const HEADERS = 'Content-Type, Authorization, X-Requested-With';

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = origin ? adminOrigins().includes(origin.replace(/\/$/, '')) : false;

  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: allowed ? 204 : 403 });
    if (allowed && origin) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Access-Control-Allow-Methods', METHODS);
      res.headers.set('Access-Control-Allow-Headers', req.headers.get('access-control-request-headers') || HEADERS);
      res.headers.set('Access-Control-Max-Age', '600');
    }
    res.headers.append('Vary', 'Origin');
    return res;
  }

  const res = NextResponse.next();
  if (allowed && origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Expose-Headers', 'Content-Disposition');
  }
  res.headers.append('Vary', 'Origin');
  return res;
}

export const config = { matcher: ['/api/:path*'] };
