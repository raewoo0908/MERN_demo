import { Schema, model } from 'mongoose';

export interface AggAgeDistributionDoc {
  dow: number;
  hour: number;
  ageBucket: string;
  count: number;
}

const AggAgeDistributionSchema = new Schema<AggAgeDistributionDoc>(
  {
    dow: Number,
    hour: Number,
    ageBucket: String,
    count: Number,
  },
  { collection: 'agg_age_distribution', strict: false },
);

export const AggAgeDistribution = model<AggAgeDistributionDoc>(
  'AggAgeDistribution',
  AggAgeDistributionSchema,
);
