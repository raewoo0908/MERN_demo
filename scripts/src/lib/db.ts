import mongoose from 'mongoose';
import { getEnv } from './env.js';

mongoose.set('autoIndex', false);

export async function connectLocal(): Promise<typeof mongoose> {
  const uri = getEnv('MONGO_URI_LOCAL');
  await mongoose.connect(uri);
  console.log(`Connected: ${maskUri(uri)}`);
  return mongoose;
}

export async function connectAtlas(): Promise<typeof mongoose> {
  const uri = getEnv('MONGO_URI_ATLAS');
  await mongoose.connect(uri);
  console.log(`Connected: ${maskUri(uri)}`);
  return mongoose;
}

export async function disconnect(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

function maskUri(uri: string): string {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}
