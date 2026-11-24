import { Schema } from 'mongoose';
import { defineModel, orgField } from './_helpers';
import { HOSTEL_TYPES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    type: { type: String, enum: HOSTEL_TYPES, required: true },
    address: String,
    city: String,
    contactPhone: String,
    capacity: { type: Number, min: 0, default: 0 },
    rules: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
schema.index({ organization: 1, code: 1 }, { unique: true });
schema.index({ organization: 1, name: 1 }, { unique: true });

export const Hostel = defineModel('Hostel', schema);
