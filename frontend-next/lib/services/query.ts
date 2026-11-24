import mongoose from 'mongoose';

/**
 * Mongoose casts string ids in find() filters but NOT inside aggregate() pipelines.
 * Casting the filter through a Query lets list endpoints reuse the exact same filter for $match.
 */
export function castFilter(model: mongoose.Model<any>, filter: Record<string, any>): Record<string, any> {
  return model.find(filter).cast(model) as Record<string, any>;
}
