import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { FEE_CATEGORIES, FEE_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    student: { ...ref('Student', true), index: true },
    hostel: ref('Hostel'),
    feeStructure: ref('FeeStructure'),
    title: { type: String, required: true },
    period: { type: String, required: true }, // e.g. 2026-11 or "ADMISSION"
    items: [{ _id: false, category: { type: String, enum: FEE_CATEGORIES }, label: String, amount: Number }],
    amount: { type: Number, required: true, min: 0 },
    lateFeePerDay: { type: Number, default: 0, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 }, // persisted late fee (frozen once paid)
    allowPartial: { type: Boolean, default: false },
    paidAmount: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: FEE_STATUSES, default: 'PENDING' },
    lastReminderAt: Date,
  },
  { timestamps: true }
);
// A student gets at most one fee record per structure and period (idempotent generation).
schema.index(
  { organization: 1, student: 1, feeStructure: 1, period: 1 },
  { unique: true, partialFilterExpression: { feeStructure: { $exists: true } } }
);
schema.index({ organization: 1, status: 1, dueDate: 1 });

export const StudentFee = defineModel('StudentFee', schema);
