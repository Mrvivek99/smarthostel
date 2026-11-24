import { Schema } from 'mongoose';
import { defineModel, fileSchema, orgField, ref } from './_helpers';
import { ADMISSION_STATUSES, GENDERS, ROOM_TYPES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    student: { ...ref('Student', true), index: true },
    preferredHostel: ref('Hostel'),
    preferredRoomType: { type: String, enum: ROOM_TYPES },
    fullName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: GENDERS, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    course: { type: String, required: true },
    year: { type: Number, required: true, min: 1, max: 10 },
    institution: String,
    enrollmentNo: String,
    guardianName: { type: String, required: true },
    guardianPhone: { type: String, required: true },
    guardianRelation: { type: String, required: true },
    emergencyName: { type: String, required: true },
    emergencyPhone: { type: String, required: true },
    documents: [fileSchema],
    status: { type: String, enum: ADMISSION_STATUSES, default: 'SUBMITTED' },
    remarks: String,
    reviewedBy: ref('User'),
    reviewedAt: Date,
  },
  { timestamps: true }
);
schema.index({ organization: 1, status: 1, createdAt: -1 });

export const AdmissionApplication = defineModel('AdmissionApplication', schema);
