import { Schema } from 'mongoose';
import { defineModel, ref } from './_helpers';

const schema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    actor: ref('User'),
    actorRole: String,
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    meta: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ organization: 1, createdAt: -1 });
schema.index({ entity: 1, entityId: 1 });

export const AuditLog = defineModel('AuditLog', schema);
