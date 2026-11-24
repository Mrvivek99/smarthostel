import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { FEE_CATEGORIES, FEE_FREQUENCIES, ROOM_TYPES } from '../constants';

export const feeItemSchema = new Schema(
  {
    category: { type: String, enum: FEE_CATEGORIES, required: true },
    label: String,
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const schema = new Schema(
  {
    organization: orgField,
    hostel: ref('Hostel'), // empty = applies to every hostel of the organization
    roomType: { type: String, enum: ROOM_TYPES },
    name: { type: String, required: true, trim: true },
    items: { type: [feeItemSchema], validate: (v: unknown[]) => v.length > 0 },
    frequency: { type: String, enum: FEE_FREQUENCIES, default: 'MONTHLY' },
    dueDay: { type: Number, min: 1, max: 28, default: 10 },
    lateFeePerDay: { type: Number, min: 0, default: 0 },
    allowPartial: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostel: 1, isActive: 1 });
schema.index({ organization: 1, name: 1 }, { unique: true });

export const FeeStructure = defineModel('FeeStructure', schema);
