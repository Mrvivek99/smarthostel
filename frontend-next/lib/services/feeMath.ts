/** Pure fee arithmetic. All amounts are rupees (numbers with at most 2 decimals). */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Late fee = whole days past due * per-day fee. Nothing before the due date. */
export function computeLateFee(dueDate: Date | string, now: Date, perDay: number): number {
  if (!perDay || perDay <= 0) return 0;
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due) || now.getTime() <= due) return 0;
  return round2(Math.floor((now.getTime() - due) / DAY_MS) * perDay);
}

export function computeBalance(amount: number, lateFee: number, paidAmount: number): number {
  return Math.max(0, round2(amount + lateFee - paidAmount));
}

export type FeeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export function deriveFeeStatus(amount: number, lateFee: number, paidAmount: number): Exclude<FeeStatus, 'CANCELLED'> {
  if (paidAmount <= 0) return 'PENDING';
  return paidAmount + 0.001 >= amount + lateFee ? 'PAID' : 'PARTIAL';
}

export const toPaise = (rupees: number) => Math.round(round2(rupees) * 100);

/** Validates an amount a student asks to pay against the outstanding balance. */
export function validatePayAmount(requested: number | undefined, balance: number, allowPartial: boolean): { ok: true; amount: number } | { ok: false; message: string } {
  if (balance <= 0) return { ok: false, message: 'Nothing is due on this fee' };
  const amount = requested === undefined ? balance : round2(requested);
  if (!(amount > 0)) return { ok: false, message: 'Amount must be greater than zero' };
  if (amount > balance + 0.001) return { ok: false, message: 'Amount exceeds the outstanding balance' };
  if (!allowPartial && Math.abs(amount - balance) > 0.001) return { ok: false, message: 'Partial payments are not enabled for this fee' };
  return { ok: true, amount };
}
