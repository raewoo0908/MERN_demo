import { Schema, model } from 'mongoose';

export interface AggStationDowHourDoc {
  stationNumber: string;
  dow: number;
  hour: number;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

const AggStationDowHourSchema = new Schema<AggStationDowHourDoc>(
  {
    stationNumber: String,
    dow: Number,
    hour: Number,
    tripCount: Number,
    distanceM: Number,
    durationMin: Number,
    avgDurationPerTrip: Number,
  },
  { collection: 'agg_station_dow_hour', strict: false },
);

export const AggStationDowHour = model<AggStationDowHourDoc>(
  'AggStationDowHour',
  AggStationDowHourSchema,
);
