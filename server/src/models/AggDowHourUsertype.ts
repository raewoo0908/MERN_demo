import { Schema, model } from 'mongoose';

export interface AggDowHourUsertypeDoc {
  dow: number;
  hour: number;
  userType: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

const AggDowHourUsertypeSchema = new Schema<AggDowHourUsertypeDoc>(
  {
    dow: Number,
    hour: Number,
    userType: String,
    tripCount: Number,
    distanceM: Number,
    durationMin: Number,
    avgDurationPerTrip: Number,
  },
  { collection: 'agg_dow_hour_usertype', strict: false },
);

export const AggDowHourUsertype = model<AggDowHourUsertypeDoc>(
  'AggDowHourUsertype',
  AggDowHourUsertypeSchema,
);
