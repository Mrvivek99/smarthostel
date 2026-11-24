import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { ROOM_STATUSES, ROOM_TYPES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    building: { ...ref('Building', true), index: true },
    floor: { ...ref('Floor', true), index: true },
    roomNumber: { type: String, required: true, trim: true },
    type: { type: String, enum: ROOM_TYPES, required: true },
    capacity: { type: Number, required: true, min: 1, max: 12 },
    status: { type: String, enum: ROOM_STATUSES, default: 'ACTIVE' },
    amenities: [String],
    monthlyRent: { type: Number, min: 0 },
  },
  { timestamps: true }
);
schema.index({ building: 1, roomNumber: 1 }, { unique: true });
schema.index({ organization: 1, hostel: 1, status: 1 });

export const Room = defineModel('Room', schema);
