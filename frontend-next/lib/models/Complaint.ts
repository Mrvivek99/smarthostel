import { Schema } from 'mongoose';
import { defineModel, fileSchema, orgField, ref } from './_helpers';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, PRIORITIES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    student: { ...ref('Student', true), index: true },
    hostel: { ...ref('Hostel', true), index: true },
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, maxlength: 4000 },
    priority: { type: String, enum: PRIORITIES, default: 'MEDIUM' },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'SUBMITTED' },
    images: [fileSchema],
    assignedTo: ref('User'),
    assignedToName: String, // maintenance staff (free text) if configured
    resolutionNotes: String,
    resolutionImages: [fileSchema],
    resolvedAt: Date,
    feedback: { rating: { type: Number, min: 1, max: 5 }, comment: String, at: Date },
    history: [{ _id: false, status: String, note: String, by: ref('User'), at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostel: 1, status: 1, createdAt: -1 });

export const Complaint = defineModel('Complaint', schema);
