import { Schema, model } from 'mongoose';

export interface HourlyUsageDoc {
  date: Date;
  hour: number;
  bucketStart: Date;
  stationNumber: string;
  stationName: string;
  userType: string;
  gender: 'M' | 'F' | null;
  ageGroup: string;
  tripCount: number;
  exerciseKcal: number;
  carbonKg: number;
  distanceM: number;
  durationMin: number;
}

const HourlyUsageSchema = new Schema<HourlyUsageDoc>(
  {
    date: { type: Date, required: true },
    hour: { type: Number, required: true, min: 0, max: 23 },
    bucketStart: { type: Date, required: true },
    stationNumber: { type: String, required: true },
    stationName: { type: String, required: true },
    userType: { type: String, required: true },
    gender: { type: String, enum: ['M', 'F', null], default: null },
    ageGroup: { type: String, required: true },
    tripCount: { type: Number, required: true },
    exerciseKcal: { type: Number, default: 0 },
    carbonKg: { type: Number, default: 0 },
    distanceM: { type: Number, default: 0 },
    durationMin: { type: Number, default: 0 },
  },
  { collection: 'hourly_usage' },
);

HourlyUsageSchema.index({ bucketStart: 1 });
HourlyUsageSchema.index({ stationNumber: 1, bucketStart: 1 });

export const HourlyUsage = model<HourlyUsageDoc>('HourlyUsage', HourlyUsageSchema);
