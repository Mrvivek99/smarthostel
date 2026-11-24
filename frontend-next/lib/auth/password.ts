import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Used to keep login timing similar when the user does not exist.
export const DUMMY_HASH = bcrypt.hashSync('smarthostel-dummy-password', COST);

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}
