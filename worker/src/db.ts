import mongoose from 'mongoose';
import { config } from './config';

export async function connectDb(): Promise<void> {
  mongoose.connection.on('error', (err) => console.error('[db] error:', err));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  await mongoose.connect(config.mongoUrl);
  console.log('[db] connected:', config.mongoUrl);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  console.log('[db] disconnected');
}
