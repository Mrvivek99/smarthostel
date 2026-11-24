import { describe, expect, it } from 'vitest';
import { AllocationCheckInput, checkAllocation, isGenderEligible, rankBeds, resolveRoomCapacity } from '@/lib/services/allocationRules';

const base: AllocationCheckInput = {
  studentStatus: 'ACTIVE', studentGender: 'MALE', studentHasActiveAllocation: false, hostelType: 'BOYS', hostelActive: true,
  roomStatus: 'ACTIVE', roomCapacity: 2, roomOccupiedBeds: 0, bedStatus: 'AVAILABLE',
};

describe('isGenderEligible', () => {
  it('matches hostel type to gender', () => {
    expect(isGenderEligible('BOYS', 'MALE')).toBe(true);
    expect(isGenderEligible('BOYS', 'FEMALE')).toBe(false);
    expect(isGenderEligible('GIRLS', 'FEMALE')).toBe(true);
    expect(isGenderEligible('GIRLS', 'OTHER')).toBe(false);
    expect(isGenderEligible('CO_ED', 'OTHER')).toBe(true);
    expect(isGenderEligible('BOYS', undefined)).toBe(false);
    expect(isGenderEligible('CO_ED', undefined)).toBe(true);
  });
});

describe('checkAllocation', () => {
  it('accepts a valid allocation', () => expect(checkAllocation(base)).toEqual({ ok: true }));
  const code = (o: Partial<AllocationCheckInput>) => {
    const r = checkAllocation({ ...base, ...o });
    return r.ok ? 'OK' : r.code;
  };
  it('rejects each violated rule', () => {
    expect(code({ studentStatus: 'PENDING' })).toBe('STUDENT_NOT_APPROVED');
    expect(code({ studentHasActiveAllocation: true })).toBe('DUPLICATE_ALLOCATION');
    expect(code({ hostelActive: false })).toBe('HOSTEL_INACTIVE');
    expect(code({ studentGender: 'FEMALE' })).toBe('GENDER_MISMATCH');
    expect(code({ roomStatus: 'MAINTENANCE' })).toBe('ROOM_MAINTENANCE');
    expect(code({ bedStatus: 'OCCUPIED' })).toBe('BED_OCCUPIED');
    expect(code({ bedStatus: 'MAINTENANCE' })).toBe('BED_MAINTENANCE');
    expect(code({ roomOccupiedBeds: 2 })).toBe('ROOM_FULL');
  });
  it('never exceeds capacity even when the bed looks free', () => expect(code({ roomCapacity: 1, roomOccupiedBeds: 1 })).toBe('ROOM_FULL'));
});

describe('rankBeds', () => {
  const c = (id: string, o: object = {}) => ({ bedId: id, roomId: 'r' + id, hostelId: 'h1', roomType: 'DOUBLE' as const, occupied: 0, capacity: 2, floorNumber: 0, ...o });
  it('prefers hostel and room type, then partially filled rooms, then lower floors', () => {
    const ranked = rankBeds([c('a', { hostelId: 'h2' }), c('b', { occupied: 1 }), c('c', { floorNumber: 5 }), c('d', { roomType: 'SINGLE' })], { preferredHostelId: 'h1', preferredRoomType: 'DOUBLE' });
    // b: 150+21, c: 150-2.5, d: 100 (hostel only), a: 50 (type only)
    expect(ranked.map((r) => r.bedId)).toEqual(['b', 'c', 'd', 'a']);
  });
  it('is deterministic on ties', () => {
    expect(rankBeds([c('z'), c('m'), c('a')]).map((r) => r.bedId)).toEqual(['a', 'm', 'z']);
  });
});

describe('resolveRoomCapacity', () => {
  it('fixes single/double and clamps shared to 3..12', () => {
    expect(resolveRoomCapacity('SINGLE', 5)).toBe(1);
    expect(resolveRoomCapacity('DOUBLE')).toBe(2);
    expect(resolveRoomCapacity('SHARED')).toBe(3);
    expect(resolveRoomCapacity('SHARED', 2)).toBe(3);
    expect(resolveRoomCapacity('SHARED', 50)).toBe(12);
    expect(resolveRoomCapacity('SHARED', 6)).toBe(6);
  });
});
