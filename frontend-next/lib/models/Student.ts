import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { GENDERS, STUDENT_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    user: { ...ref('User', true), unique: true },
    // Denormalised for fast search/listing; kept in sync by the profile update code paths.
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    enrollmentNo: { type: String, trim: true },
    gender: { type: String, enum: GENDERS },
    dob: Date,
    course: String,
    year: Number,
    department: String,
    address: String,
    guardianName: String,
    guardianPhone: String,
    guardianRelation: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    status: { type: String, enum: STUDENT_STATUSES, default: 'PENDING', index: true },
    // Current placement (maintained by the allocation service).
    hostel: ref('Hostel'),
    room: ref('Room'),
    bed: ref('Bed'),
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostel: 1 });
schema.index({ organization: 1, name: 1 });
schema.index({ organization: 1, enrollmentNo: 1 }, { unique: true, partialFilterExpression: { enrollmentNo: { $type: 'string' } } });

export const Student = defineModel('Student', schema);
