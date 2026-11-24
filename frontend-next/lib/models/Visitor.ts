import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { VERIFICATION_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    student: { ...ref('Student', true), index: true },
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true },
    relationship: { type: String, required: true },
    purpose: { type: String, required: true },
    entryTime: { type: Date, default: Date.now },
    exitTime: Date,
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'PENDING' },
    registeredBy: ref('User'),
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostel: 1, entryTime: -1 });

export const Visitor = defineModel('Visitor', schema);
