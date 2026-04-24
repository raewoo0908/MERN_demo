import { Schema, model } from 'mongoose';

export type OdBucket = 'AM_commute' | 'PM_commute' | 'weekend';

export interface AggOdTopDoc {
  bucket: OdBucket;
  rank: number;
  rentStation: string;
  returnStation: string;
  tripCount: number;
}

const AggOdTopSchema = new Schema<AggOdTopDoc>(
  {
    bucket: String,
    rank: Number,
    rentStation: String,
    returnStation: String,
    tripCount: Number,
  },
  { collection: 'agg_od_top', strict: false },
);

export const AggOdTop = model<AggOdTopDoc>('AggOdTop', AggOdTopSchema);
