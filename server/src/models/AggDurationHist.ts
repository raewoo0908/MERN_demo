import { Schema, model } from 'mongoose';

export interface AggDurationHistDoc {
  bucket: string;
  count: number;
}

const AggDurationHistSchema = new Schema<AggDurationHistDoc>(
  {
    bucket: String,
    count: Number,
  },
  { collection: 'agg_duration_hist', strict: false },
);

export const AggDurationHist = model<AggDurationHistDoc>(
  'AggDurationHist',
  AggDurationHistSchema,
);
