import { describe, expect, it } from 'vitest';
import { computeBalance, computeLateFee, deriveFeeStatus, round2, toPaise, validatePayAmount } from '@/lib/services/feeMath';

const DAY = 86400000;
const due = new Date('2026-11-10T00:00:00Z');

describe('computeLateFee', () => {
  it('is zero before or on the due date', () => {
    expect(computeLateFee(due, new Date(due.getTime() - DAY), 20)).toBe(0);
    expect(computeLateFee(due, due, 20)).toBe(0);
  });
  it('counts whole days past due', () => {
    expect(computeLateFee(due, new Date(due.getTime() + DAY * 3 + 1000), 20)).toBe(60);
    expect(computeLateFee(due, new Date(due.getTime() + DAY - 1), 20)).toBe(0);
  });
  it('is zero when no per-day fee or an invalid date', () => {
    expect(computeLateFee(due, new Date(due.getTime() + 10 * DAY), 0)).toBe(0);
    expect(computeLateFee('nope', new Date(), 5)).toBe(0);
  });
});

describe('balance and status', () => {
  it('computes balance without going negative', () => {
    expect(computeBalance(1000, 50, 400)).toBe(650);
    expect(computeBalance(1000, 0, 1500)).toBe(0);
  });
  it('derives status', () => {
    expect(deriveFeeStatus(1000, 0, 0)).toBe('PENDING');
    expect(deriveFeeStatus(1000, 0, 400)).toBe('PARTIAL');
    expect(deriveFeeStatus(1000, 50, 1050)).toBe('PAID');
    expect(deriveFeeStatus(1000, 50, 1000)).toBe('PARTIAL');
  });
});

describe('rounding and paise', () => {
  it('rounds to 2 decimals and converts to paise exactly', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(toPaise(10.1)).toBe(1010);
    expect(toPaise(19.99)).toBe(1999);
    expect(toPaise(0.29)).toBe(29);
  });
});

describe('validatePayAmount', () => {
  it('defaults to the full balance', () => expect(validatePayAmount(undefined, 500, false)).toEqual({ ok: true, amount: 500 }));
  it('rejects nothing due, overpay, zero and disallowed partial', () => {
    expect(validatePayAmount(undefined, 0, false).ok).toBe(false);
    expect(validatePayAmount(600, 500, true).ok).toBe(false);
    expect(validatePayAmount(0, 500, true).ok).toBe(false);
    expect(validatePayAmount(200, 500, false).ok).toBe(false);
  });
  it('allows partial when enabled', () => expect(validatePayAmount(200, 500, true)).toEqual({ ok: true, amount: 200 }));
});
