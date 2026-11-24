import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { ATTENDANCE_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    student: { ...ref('Student', true), index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    remarks: String,
    markedBy: ref('User'),
    // Audit trail of every change to this record.
    history: [{ _id: false, from: String, to: String, by: ref('User'), at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);
schema.index({ student: 1, date: 1 }, { unique: true });
schema.index({ organization: 1, hostel: 1, date: 1 });

export const Attendance = defineModel('Attendance', schema);
