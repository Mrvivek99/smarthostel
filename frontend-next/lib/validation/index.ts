import { z } from 'zod';
import * as C from '@/lib/constants';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const str = (max = 200) => z.string().trim().max(max);
const reqStr = (max = 200) => z.string().trim().min(1, 'Required').max(max);
const email = z.string().trim().toLowerCase().email('Invalid email').max(160);
const phone = z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, 'Invalid phone number');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');
const date = z.coerce.date();
const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const url = z.string().trim().url().max(500);
const money = z.coerce.number().min(0).max(10_000_000);
const file = z.object({ url, publicId: z.string().max(200).optional(), type: z.string().max(40).optional() });
const gender = z.enum(C.GENDERS);

// ---------- auth ----------
export const registerSchema = z.object({
  name: reqStr(80).min(2),
  email,
  password,
  phone: phone.optional(),
  gender,
  organizationCode: z.string().trim().toLowerCase().min(2).max(40),
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(100) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });
export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200).optional() });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(100), newPassword: password });
export const contactSchema = z.object({ name: reqStr(80), email, subject: reqStr(140), message: reqStr(3000).min(10) });

// ---------- people ----------
const studentProfileFields = {
  phone: phone.optional(),
  gender: gender.optional(),
  dob: date.optional(),
  enrollmentNo: str(40).optional(),
  course: str(100).optional(),
  year: z.coerce.number().int().min(1).max(10).optional(),
  department: str(100).optional(),
  address: str(300).optional(),
  guardianName: str(80).optional(),
  guardianPhone: phone.optional(),
  guardianRelation: str(40).optional(),
  emergencyContactName: str(80).optional(),
  emergencyContactPhone: phone.optional(),
};
export const studentCreateSchema = z.object({ name: reqStr(80).min(2), email, password, ...studentProfileFields });
export const studentUpdateSchema = z
  .object({
    name: reqStr(80).min(2).optional(),
    avatarUrl: url.optional(),
    status: z.enum(C.STUDENT_STATUSES).optional(),
    isActive: z.boolean().optional(),
    ...studentProfileFields,
  })
  .strict();
/** Fields a student may change on their own profile. */
export const studentSelfUpdateSchema = z
  .object({ name: reqStr(80).min(2).optional(), avatarUrl: url.optional(), ...studentProfileFields })
  .strict();

export const wardenCreateSchema = z.object({
  name: reqStr(80).min(2),
  email,
  password,
  phone: phone.optional(),
  employeeId: str(40).optional(),
  hostels: z.array(objectId).max(50).default([]),
});
export const wardenUpdateSchema = z.object({
  name: reqStr(80).min(2).optional(),
  phone: phone.optional(),
  employeeId: str(40).optional(),
  hostels: z.array(objectId).max(50).optional(),
  isActive: z.boolean().optional(),
});
export const userUpdateSchema = z.object({ isActive: z.boolean().optional(), name: reqStr(80).min(2).optional(), phone: phone.optional() });

// ---------- infrastructure ----------
export const hostelSchema = z.object({
  name: reqStr(120),
  code: reqStr(20),
  type: z.enum(C.HOSTEL_TYPES),
  address: str(300).optional(),
  city: str(80).optional(),
  contactPhone: phone.optional(),
  capacity: z.coerce.number().int().min(0).max(100000).optional(),
  rules: z.array(reqStr(300)).max(50).optional(),
  isActive: z.boolean().optional(),
  wardenIds: z.array(objectId).max(50).optional(),
});
export const hostelUpdateSchema = hostelSchema.partial();
export const buildingSchema = z.object({ hostel: objectId, name: reqStr(80), code: str(20).optional(), description: str(300).optional() });
export const buildingUpdateSchema = buildingSchema.omit({ hostel: true }).partial();
export const floorSchema = z.object({ hostel: objectId, building: objectId, number: z.coerce.number().int().min(-2).max(100), label: str(60).optional() });
export const floorUpdateSchema = z.object({ label: str(60).optional(), number: z.coerce.number().int().min(-2).max(100).optional() });
export const roomSchema = z.object({
  hostel: objectId,
  building: objectId,
  floor: objectId,
  roomNumber: reqStr(20),
  type: z.enum(C.ROOM_TYPES),
  capacity: z.coerce.number().int().min(1).max(12).optional(),
  amenities: z.array(reqStr(40)).max(20).optional(),
  monthlyRent: money.optional(),
  status: z.enum(C.ROOM_STATUSES).optional(),
  createBeds: z.boolean().default(true),
});
export const roomUpdateSchema = z.object({
  roomNumber: reqStr(20).optional(),
  type: z.enum(C.ROOM_TYPES).optional(),
  capacity: z.coerce.number().int().min(1).max(12).optional(),
  amenities: z.array(reqStr(40)).max(20).optional(),
  monthlyRent: money.optional(),
  status: z.enum(C.ROOM_STATUSES).optional(),
});
export const bedCreateSchema = z.object({ room: objectId, bedNumber: str(20).optional() });
export const bedUpdateSchema = z.object({ status: z.enum(['AVAILABLE', 'MAINTENANCE']) });

// ---------- allocation & admission ----------
export const allocationCreateSchema = z.object({ student: objectId, bed: objectId, remarks: str(300).optional() });
export const allocationActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('checkout'), remarks: str(300).optional() }),
  z.object({ action: z.literal('transfer'), bed: objectId, remarks: str(300).optional() }),
]);
export const roomChangeSchema = z.object({ reason: reqStr(500).min(10), preferredRoomType: z.enum(C.ROOM_TYPES).optional() });
export const admissionSchema = z.object({
  preferredHostel: objectId.optional(),
  preferredRoomType: z.enum(C.ROOM_TYPES).optional(),
  fullName: reqStr(80),
  dob: date,
  gender,
  phone,
  address: reqStr(300),
  course: reqStr(100),
  year: z.coerce.number().int().min(1).max(10),
  institution: str(150).optional(),
  enrollmentNo: str(40).optional(),
  guardianName: reqStr(80),
  guardianPhone: phone,
  guardianRelation: reqStr(40),
  emergencyName: reqStr(80),
  emergencyPhone: phone,
  documents: z.array(file).max(6).default([]),
});
export const admissionReviewSchema = z.object({ status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED']), remarks: str(500).optional() });

// ---------- fees & payments ----------
const feeItem = z.object({ category: z.enum(C.FEE_CATEGORIES), label: str(80).optional(), amount: money });
export const feeStructureSchema = z.object({
  name: reqStr(100),
  hostel: objectId.optional(),
  roomType: z.enum(C.ROOM_TYPES).optional(),
  items: z.array(feeItem).min(1).max(20),
  frequency: z.enum(C.FEE_FREQUENCIES).default('MONTHLY'),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  lateFeePerDay: money.default(0),
  allowPartial: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export const feeStructureUpdateSchema = feeStructureSchema.partial();
export const feeGenerateSchema = z.object({
  feeStructure: objectId,
  period: z.string().trim().regex(/^(\d{4}-\d{2}|[A-Z_]{3,20})$/, 'Period must be YYYY-MM or an uppercase label like ADMISSION'),
  dueDate: date.optional(),
  hostel: objectId.optional(),
});
export const feeCreateSchema = z.object({
  student: objectId,
  title: reqStr(120),
  amount: money.refine((n) => n > 0, 'Amount must be positive'),
  dueDate: date,
  category: z.enum(C.FEE_CATEGORIES).default('OTHER'),
  lateFeePerDay: money.default(0),
  allowPartial: z.boolean().default(false),
});
export const feeUpdateSchema = z.object({ dueDate: date.optional(), lateFeePerDay: money.optional(), status: z.literal('CANCELLED').optional() });
export const createOrderSchema = z.object({ feeId: objectId, amount: z.coerce.number().positive().max(10_000_000).optional() });
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().min(10).max(200),
});
export const refundSchema = z.object({ paymentId: objectId, amount: z.coerce.number().positive().optional(), reason: reqStr(300) });

// ---------- operations ----------
export const attendanceMarkSchema = z.object({
  hostel: objectId,
  date: dayString,
  records: z.array(z.object({ student: objectId, status: z.enum(C.ATTENDANCE_STATUSES), remarks: str(200).optional() })).min(1).max(1000),
});
export const complaintSchema = z.object({
  category: z.enum(C.COMPLAINT_CATEGORIES),
  title: reqStr(140).min(3),
  description: reqStr(4000).min(10),
  priority: z.enum(C.PRIORITIES).default('MEDIUM'),
  images: z.array(file).max(5).default([]),
});
export const complaintUpdateSchema = z.object({
  status: z.enum(C.COMPLAINT_STATUSES).optional(),
  priority: z.enum(C.PRIORITIES).optional(),
  assignedTo: objectId.optional(),
  assignedToName: str(80).optional(),
  resolutionNotes: str(2000).optional(),
  resolutionImages: z.array(file).max(5).optional(),
  note: str(300).optional(),
  feedback: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: str(500).optional() }).optional(),
});
export const leaveSchema = z.object({
  reason: reqStr(1000).min(5),
  departureDate: date,
  returnDate: date,
  emergencyContactName: str(80).optional(),
  emergencyContactPhone: phone,
  documentUrl: url.optional(),
});
export const leaveReviewSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']), remarks: str(500).optional() });
export const visitorSchema = z.object({
  hostel: objectId,
  student: objectId,
  name: reqStr(80),
  contact: phone,
  relationship: reqStr(40),
  purpose: reqStr(200),
  entryTime: date.optional(),
  verificationStatus: z.enum(C.VERIFICATION_STATUSES).optional(),
});
export const visitorUpdateSchema = z.object({ exitTime: date.optional(), markExit: z.boolean().optional(), verificationStatus: z.enum(C.VERIFICATION_STATUSES).optional() });
export const noticeSchema = z.object({
  title: reqStr(160).min(3),
  body: reqStr(8000).min(3),
  hostel: objectId.optional(),
  audience: z.enum(C.NOTICE_AUDIENCES).default('ALL'),
  priority: z.enum(C.PRIORITIES).default('MEDIUM'),
  pinned: z.boolean().default(false),
  expiresAt: date.optional(),
});
export const inventorySchema = z.object({
  hostel: objectId,
  name: reqStr(100),
  category: z.enum(C.INVENTORY_CATEGORIES),
  quantity: z.coerce.number().int().min(0).max(100000),
  condition: z.enum(C.INVENTORY_CONDITIONS).default('GOOD'),
  assignedRoom: objectId.optional(),
  notes: str(300).optional(),
});
export const inventoryUpdateSchema = inventorySchema.partial().extend({
  maintenance: z.object({ note: reqStr(300), cost: money.optional() }).optional(),
});
export const expenseSchema = z.object({
  hostel: objectId,
  category: z.enum(C.EXPENSE_CATEGORIES),
  amount: money.refine((n) => n > 0, 'Amount must be positive'),
  date,
  description: str(300).optional(),
  billUrl: url.optional(),
});

// ---------- SaaS ----------
export const subscriptionSchema = z.object({
  organization: objectId.optional(), // honoured only for SUPER_ADMIN; ADMIN always acts on their own organization
  plan: z.enum(C.PLANS),
  durationMonths: z.coerce.number().int().min(1).max(36).default(1),
  customPrice: money.optional(),
});
export const organizationCreateSchema = z.object({
  name: reqStr(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, 'Use 2-40 lowercase letters, numbers or dashes'),
  email: email.optional(),
  phone: phone.optional(),
  address: str(300).optional(),
  plan: z.enum(C.PLANS).default('STARTER'),
  adminName: reqStr(80),
  adminEmail: email,
  adminPassword: password,
});
export const organizationUpdateSchema = z.object({
  name: reqStr(120).optional(),
  email: email.optional(),
  phone: phone.optional(),
  address: str(300).optional(),
  logoUrl: url.optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export const notificationsReadSchema = z.object({ ids: z.array(objectId).max(100).optional(), all: z.boolean().optional() });
export const uploadSchema = z.object({
  folder: z.enum(['avatars', 'documents', 'complaints', 'leave', 'receipts', 'misc']).default('misc'),
});
