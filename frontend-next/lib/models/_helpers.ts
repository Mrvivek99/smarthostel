import mongoose, { Model, Schema, SchemaDefinitionProperty } from 'mongoose';

export function defineModel(name: string, schema: Schema): Model<any> {
  return (mongoose.models[name] as Model<any>) || mongoose.model<any>(name, schema);
}

export const ref = (to: string, required = false): Record<string, any> => ({ type: Schema.Types.ObjectId, ref: to, required });

/** Tenant ownership field carried by every tenant-owned document. */
export const orgField: Record<string, any> = { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true };

export const fileSchema = new Schema({ url: { type: String, required: true }, publicId: String, type: String }, { _id: false });
