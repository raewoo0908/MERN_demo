import { Schema, model } from 'mongoose';

export interface AggStationTotalDoc {
  stationNumber: string;
  stationName: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

const AggStationTotalSchema = new Schema<AggStationTotalDoc>(
  {
    stationNumber: String,
    stationName: String,
    tripCount: Number,
    distanceM: Number,
    durationMin: Number,
    avgDurationPerTrip: Number,
  },
  { collection: 'agg_station_total', strict: false },
);

export const AggStationTotal = model<AggStationTotalDoc>(
  'AggStationTotal',
  AggStationTotalSchema,
);
