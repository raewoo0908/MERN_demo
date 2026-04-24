import { Schema, model } from 'mongoose';

export interface AggMonthlyTrendDoc {
  district: string;
  yearMonth: string;
  rentCount: number;
  returnCount: number;
  netFlow: number;
  stationCount: number;
}

const AggMonthlyTrendSchema = new Schema<AggMonthlyTrendDoc>(
  {
    district: String,
    yearMonth: String,
    rentCount: Number,
    returnCount: Number,
    netFlow: Number,
    stationCount: Number,
  },
  { collection: 'agg_monthly_trend', strict: false },
);

export const AggMonthlyTrend = model<AggMonthlyTrendDoc>(
  'AggMonthlyTrend',
  AggMonthlyTrendSchema,
);
