import { Schema, model } from 'mongoose';

export interface AggDemographicHourDoc {
  dow: number;
  hour: number;
  gender: 'M' | 'F' | null;
  ageGroup: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

const AggDemographicHourSchema = new Schema<AggDemographicHourDoc>(
  {
    dow: Number,
    hour: Number,
    gender: String,
    ageGroup: String,
    tripCount: Number,
    distanceM: Number,
    durationMin: Number,
    avgDurationPerTrip: Number,
  },
  { collection: 'agg_demographic_hour', strict: false },
);

export const AggDemographicHour = model<AggDemographicHourDoc>(
  'AggDemographicHour',
  AggDemographicHourSchema,
);
