import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { BED_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    room: { ...ref('Room', true), index: true },
    bedNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: BED_STATUSES, default: 'AVAILABLE' },
  },
  { timestamps: true }
);
schema.index({ room: 1, bedNumber: 1 }, { unique: true });
schema.index({ organization: 1, hostel: 1, status: 1 });

export const Bed = defineModel('Bed', schema);
