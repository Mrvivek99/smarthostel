/**
 * Pure allocation rules (no database access) so they can be unit tested.
 * The allocation service enforces these on the server before touching the database;
 * the database enforces them again with atomic updates and partial unique indexes.
 */

export type HostelType = 'BOYS' | 'GIRLS' | 'CO_ED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

/** Boys' hostels accept MALE students, girls' hostels accept FEMALE students, co-ed accepts everyone. */
export function isGenderEligible(hostelType: HostelType, gender: Gender | undefined | null): boolean {
  if (hostelType === 'CO_ED') return true;
  if (!gender) return false;
  if (hostelType === 'BOYS') return gender === 'MALE';
  if (hostelType === 'GIRLS') return gender === 'FEMALE';
  return false;
}

export interface AllocationCheckInput {
  studentStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  studentGender?: Gender | null;
  studentHasActiveAllocation: boolean;
  hostelType: HostelType;
  hostelActive: boolean;
  roomStatus: 'ACTIVE' | 'MAINTENANCE';
  roomCapacity: number;
  roomOccupiedBeds: number;
  bedStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}

export type AllocationCheck = { ok: true } | { ok: false; code: string; message: string };

/** Returns the first violated business rule, or ok. Order matters: cheapest/most informative first. */
export function checkAllocation(i: AllocationCheckInput): AllocationCheck {
  if (i.studentStatus !== 'ACTIVE')
    return { ok: false, code: 'STUDENT_NOT_APPROVED', message: 'Student admission is not approved (student is not active)' };
  if (i.studentHasActiveAllocation)
    return { ok: false, code: 'DUPLICATE_ALLOCATION', message: 'Student already has an active allocation' };
  if (!i.hostelActive) return { ok: false, code: 'HOSTEL_INACTIVE', message: 'Hostel is not active' };
  if (!isGenderEligible(i.hostelType, i.studentGender))
    return { ok: false, code: 'GENDER_MISMATCH', message: 'Student is not eligible for this hostel (gender restriction)' };
  if (i.roomStatus !== 'ACTIVE') return { ok: false, code: 'ROOM_MAINTENANCE', message: 'Room is under maintenance' };
  if (i.bedStatus === 'OCCUPIED') return { ok: false, code: 'BED_OCCUPIED', message: 'Bed is already occupied' };
  if (i.bedStatus === 'MAINTENANCE') return { ok: false, code: 'BED_MAINTENANCE', message: 'Bed is under maintenance' };
  if (i.roomOccupiedBeds >= i.roomCapacity) return { ok: false, code: 'ROOM_FULL', message: 'Room capacity would be exceeded' };
  return { ok: true };
}

export interface BedCandidate {
  bedId: string;
  roomId: string;
  hostelId: string;
  roomType: 'SINGLE' | 'DOUBLE' | 'SHARED';
  occupied: number;
  capacity: number;
  floorNumber: number;
}

export interface SuggestPrefs {
  preferredHostelId?: string;
  preferredRoomType?: 'SINGLE' | 'DOUBLE' | 'SHARED';
}

/**
 * Scores candidate beds: preferred hostel/room type first, then fill partially occupied rooms
 * (keeps whole rooms free), then lower floors. Deterministic: ties broken by bedId.
 */
export function rankBeds<T extends BedCandidate>(candidates: T[], prefs: SuggestPrefs = {}): (T & { score: number })[] {
  return candidates
    .map((c) => {
      let score = 0;
      if (prefs.preferredHostelId && c.hostelId === prefs.preferredHostelId) score += 100;
      if (prefs.preferredRoomType && c.roomType === prefs.preferredRoomType) score += 50;
      if (c.occupied > 0 && c.occupied < c.capacity) score += 20 + c.occupied; // fill rooms already in use
      score -= Math.min(c.floorNumber, 20) * 0.5;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score || a.bedId.localeCompare(b.bedId));
}

/** Default capacity per room type; SHARED needs an explicit capacity (3..12). */
export function resolveRoomCapacity(type: 'SINGLE' | 'DOUBLE' | 'SHARED', requested?: number): number {
  if (type === 'SINGLE') return 1;
  if (type === 'DOUBLE') return 2;
  const c = requested ?? 3;
  return Math.min(12, Math.max(3, Math.floor(c)));
}
