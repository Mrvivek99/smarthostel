import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { LEAVE_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    student: { ...ref('Student', true), index: true },
    hostel: { ...ref('Hostel', true), index: true },
    reason: { type: String, required: true, maxlength: 1000 },
    departureDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    emergencyContactName: String,
    emergencyContactPhone: { type: String, required: true },
    documentUrl: String,
    status: { type: String, enum: LEAVE_STATUSES, default: 'PENDING' },
    remarks: String,
    reviewedBy: ref('User'),
    reviewedAt: Date,
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostel: 1, status: 1, createdAt: -1 });
schema.index({ student: 1, departureDate: 1, returnDate: 1 });

export const LeaveRequest = defineModel('LeaveRequest', schema);
