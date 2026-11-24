import { NextRequest } from 'next/server';
import { ok, handleError } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth/respond';

// Logging out never requires a valid session (an expired cookie must still be clearable) and needs no database.
export async function POST(_req: NextRequest) {
  try {
    return clearSessionCookie(ok({ loggedOut: true }));
  } catch (e) {
    return handleError(e);
  }
}
