export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'WARDEN', 'STUDENT'] as const;
export type Role = (typeof ROLES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export const HOSTEL_TYPES = ['BOYS', 'GIRLS', 'CO_ED'] as const;
export const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'SHARED'] as const;
export const ROOM_STATUSES = ['ACTIVE', 'MAINTENANCE'] as const;
export const BED_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as const;
export const ALLOCATION_STATUSES = ['ACTIVE', 'CHECKED_OUT', 'TRANSFERRED'] as const;
export const STUDENT_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE'] as const;
export const ADMISSION_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const;
export const FEE_CATEGORIES = ['ADMISSION', 'MONTHLY_HOSTEL', 'SECURITY_DEPOSIT', 'MESS', 'ELECTRICITY', 'MAINTENANCE', 'OTHER'] as const;
export const FEE_FREQUENCIES = ['ONE_TIME', 'MONTHLY'] as const;
export const FEE_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['CREATED', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;
export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'ON_LEAVE'] as const;
export const COMPLAINT_CATEGORIES = ['ELECTRICAL', 'PLUMBING', 'CLEANING', 'INTERNET', 'FURNITURE', 'MESS', 'MAINTENANCE', 'OTHER'] as const;
export const COMPLAINT_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export const NOTICE_AUDIENCES = ['ALL', 'STUDENTS', 'WARDENS'] as const;
export const INVENTORY_CATEGORIES = ['BED', 'MATTRESS', 'TABLE', 'CHAIR', 'FAN', 'LIGHT', 'LOCKER', 'OTHER'] as const;
export const INVENTORY_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const;
export const EXPENSE_CATEGORIES = ['ELECTRICITY', 'WATER', 'MAINTENANCE', 'CLEANING', 'INTERNET', 'OTHER'] as const;
export const PLANS = ['STARTER', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'] as const;
export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'EXPIRED', 'CANCELLED'] as const;
export const NOTIFICATION_TYPES = ['ALLOCATION', 'PAYMENT', 'FEE', 'COMPLAINT', 'LEAVE', 'NOTICE', 'ADMISSION', 'SYSTEM'] as const;

/** Limits of -1 mean unlimited. Prices are INR per month (ENTERPRISE is custom). */
export const PLAN_CONFIG: Record<(typeof PLANS)[number], { price: number; hostels: number; students: number; wardens: number }> = {
  STARTER: { price: 499, hostels: 1, students: 100, wardens: 2 },
  STANDARD: { price: 999, hostels: 3, students: 500, wardens: 10 },
  PROFESSIONAL: { price: 1999, hostels: 10, students: 2000, wardens: 50 },
  ENTERPRISE: { price: 0, hostels: -1, students: -1, wardens: -1 },
};

export const AUTH_COOKIE = 'sh_token';

/** Where each portal role lands after login. Admin roles are handled by the admin SPA. */
export const ROLE_HOME: Record<string, string> = {
  STUDENT: '/student/dashboard',
  WARDEN: '/warden/dashboard',
};
