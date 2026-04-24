import { Schema, model } from 'mongoose';

export interface StationDoc {
  stationNumber: string;
  stationInternalId?: string;
  name: string;
  nameFull: string;
  lat: number;
  lng: number;
  rackCount: number;
  district?: string;
}

const StationSchema = new Schema<StationDoc>(
  {
    stationNumber: { type: String, required: true, unique: true, index: true },
    stationInternalId: { type: String, index: true },
    name: { type: String, required: true },
    nameFull: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    rackCount: { type: Number, required: true },
    district: { type: String },
  },
  { timestamps: true, collection: 'stations' },
);

export const Station = model<StationDoc>('Station', StationSchema);
