import { Schema, model } from 'mongoose';

export interface StationMonthlyDoc {
  district: string;
  stationNumber: string;
  stationName: string;
  yearMonth: string;
  rentCount: number;
  returnCount: number;
  netFlow: number;
}

const StationMonthlySchema = new Schema<StationMonthlyDoc>(
  {
    district: { type: String, required: true, index: true },
    stationNumber: { type: String, required: true, index: true },
    stationName: { type: String, required: true },
    yearMonth: { type: String, required: true, index: true },
    rentCount: { type: Number, required: true },
    returnCount: { type: Number, required: true },
    netFlow: { type: Number, required: true },
  },
  { collection: 'station_monthly' },
);

StationMonthlySchema.index({ stationNumber: 1, yearMonth: 1 }, { unique: true });

export const StationMonthly = model<StationMonthlyDoc>(
  'StationMonthly',
  StationMonthlySchema,
);
