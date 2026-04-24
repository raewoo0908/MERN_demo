import { Schema, model } from 'mongoose';

export interface AggHourlyDoc {
  date: Date;
  hour: number;
  bucketStart: Date;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

const AggHourlySchema = new Schema<AggHourlyDoc>(
  {
    date: Date,
    hour: Number,
    bucketStart: Date,
    tripCount: Number,
    distanceM: Number,
    durationMin: Number,
    avgDurationPerTrip: Number,
  },
  { collection: 'agg_hourly', strict: false },
);

export const AggHourly = model<AggHourlyDoc>('AggHourly', AggHourlySchema);
