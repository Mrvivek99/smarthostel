import type { FieldDef, Option } from '../types';
import { nm, titleCase } from './format';

export const opts = (...vals: string[]): Option[] => vals.map((v) => ({ value: v, label: titleCase(v) }));

export const GENDERS = opts('MALE', 'FEMALE', 'OTHER');
export const HOSTEL_TYPES = [{ value: 'BOYS', label: 'Boys' }, { value: 'GIRLS', label: 'Girls' }, { value: 'CO_ED', label: 'Co-ed' }];
export const ROOM_TYPES = opts('SINGLE', 'DOUBLE', 'SHARED');
export const COMPLAINT_CATEGORIES = opts('ELECTRICAL', 'PLUMBING', 'CLEANING', 'INTERNET', 'FURNITURE', 'MESS', 'MAINTENANCE', 'OTHER');
export const PRIORITIES = opts('LOW', 'MEDIUM', 'HIGH', 'URGENT');
export const FEE_CATEGORIES = opts('ADMISSION', 'MONTHLY_HOSTEL', 'SECURITY_DEPOSIT', 'MESS', 'ELECTRICITY', 'MAINTENANCE', 'OTHER');
export const EXPENSE_CATEGORIES = opts('ELECTRICITY', 'WATER', 'MAINTENANCE', 'CLEANING', 'INTERNET', 'OTHER');
export const INVENTORY_CATEGORIES = opts('BED', 'MATTRESS', 'TABLE', 'CHAIR', 'FAN', 'LIGHT', 'LOCKER', 'OTHER');
export const CONDITIONS = opts('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

export const remoteSelect = (name: string, labelText: string, endpoint: string, labelFn: (r: any) => string, required = false, extra: Partial<FieldDef> = {}): FieldDef => ({
  name, label: labelText, type: 'select', required,
  remote: { endpoint, label: labelFn }, ...extra,
});

export const hostelField = (required = true): FieldDef => remoteSelect('hostel', 'Hostel', '/api/hostels', (r) => r.name, required);
export const studentField = (name = 'student', required = true): FieldDef =>
  remoteSelect(name, 'Student', '/api/students', (r) => `${nm(r)}${r.rollNumber ? ` (${r.rollNumber})` : r.email ? ` (${r.email})` : ''}`, required);
export const wardenField = (name = 'warden', labelText = 'Warden', required = false): FieldDef =>
  remoteSelect(name, labelText, '/api/admin/users', (r) => `${nm(r)} (${r.email})`, required, { remote: { endpoint: '/api/admin/users', params: { role: 'WARDEN' }, label: (r) => `${nm(r)} (${r.email})` } });

export const phoneRule = { pattern: /^[0-9+\-\s()]{7,20}$/, patternMessage: 'Enter a valid phone number (7-20 digits)' };
export const passwordRule: Partial<FieldDef> = {
  minLength: 8,
  hint: 'At least 8 characters with a letter and a number',
  validate: (v) => (!/[A-Za-z]/.test(String(v)) ? 'Password must contain a letter' : !/[0-9]/.test(String(v)) ? 'Password must contain a number' : undefined),
};
export const ROOM_STATUSES = opts('ACTIVE', 'MAINTENANCE');
export const STUDENT_STATUSES = opts('PENDING', 'ACTIVE', 'INACTIVE');
export const FEE_FREQUENCIES = [{ value: 'ONE_TIME', label: 'One time' }, { value: 'MONTHLY', label: 'Monthly' }];
export const VERIFICATION_STATUSES = opts('PENDING', 'VERIFIED', 'REJECTED');
export const NOTICE_AUDIENCES = opts('ALL', 'STUDENTS', 'WARDENS');
export const COMPLAINT_STATUSES = opts('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');
export const urlRule = { validate: (v: any) => { try { new URL(String(v)); return undefined; } catch { return 'Enter a valid URL (https://…)'; } } };
