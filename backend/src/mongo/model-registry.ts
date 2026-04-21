import mongoose, { type Model, type Schema } from "mongoose";

/**
 * Returns the model for `name` — registering it if unregistered, reusing it if already present.
 * Avoids Mongoose's "Cannot overwrite model once compiled" when the app and the seed script
 * share a process (notably in e2e tests where Nest's MongooseModule pre-registers models).
 */
export function ensureModel<T>(name: string, schema: Schema<T>): Model<T> {
  if (mongoose.modelNames().includes(name)) {
    return mongoose.model<T>(name);
  }
  return mongoose.model<T>(name, schema);
}
