import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { ALLOCATION_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    student: { ...ref('Student', true), index: true },
    bed: { ...ref('Bed', true), index: true },
    room: ref('Room', true),
    hostel: { ...ref('Hostel', true), index: true },
    status: { type: String, enum: ALLOCATION_STATUSES, default: 'ACTIVE' },
    checkInDate: { type: Date, default: Date.now },
    checkOutDate: Date,
    allocatedBy: ref('User'),
    transferredFrom: ref('RoomAllocation'),
    remarks: String,
  },
  { timestamps: true }
);
// Invariants enforced by the database itself: one ACTIVE allocation per student and per bed.
schema.index({ student: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'uniq_active_allocation_per_student' });
schema.index({ bed: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'uniq_active_allocation_per_bed' });
schema.index({ organization: 1, status: 1, createdAt: -1 });

export const RoomAllocation = defineModel('RoomAllocation', schema);
