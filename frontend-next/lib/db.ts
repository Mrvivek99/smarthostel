import mongoose, { ClientSession } from 'mongoose';
import '@/lib/models';

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null; txUnsupported: boolean };
const g = globalThis as unknown as { _smarthostelMongoose?: Cache };
const cached: Cache = g._smarthostelMongoose ?? (g._smarthostelMongoose = { conn: null, promise: null, txUnsupported: false });

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false, maxPoolSize: 10, serverSelectionTimeoutMS: 10000 })
      .catch((e) => {
        cached.promise = null;
        throw e;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

function isTxUnsupported(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? '');
  return /Transaction numbers are only allowed on a replica set|replica set member or mongos|does not support transactions/i.test(msg);
}

/**
 * Runs `fn` inside a MongoDB transaction. On a standalone mongod (no replica set) transactions are
 * unavailable: `fn` is then run with `session === undefined` and must apply its own compensation on error
 * (the services do this via an `undo` stack). Atlas / replica sets always take the transactional path.
 */
export async function withTransaction<T>(fn: (session: ClientSession | undefined) => Promise<T>): Promise<T> {
  if (cached.txUnsupported) return fn(undefined);
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (e) {
    if (isTxUnsupported(e)) {
      cached.txUnsupported = true;
      return fn(undefined);
    }
    throw e;
  } finally {
    await session.endSession();
  }
}
