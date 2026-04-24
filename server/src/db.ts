import mongoose from 'mongoose';

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI env var must be set');
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}
