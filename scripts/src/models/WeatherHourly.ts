import { Schema, model } from 'mongoose';

export interface WeatherHourlyDoc {
  hour: Date;
  stationId: number;
  tempC: number | null;
  humidityPct: number | null;
  windMs: number | null;
  rainfall3hMm: number | null;
  rainfallDayMm: number | null;
  cloudCoverTenths: number | null;
}

const WeatherHourlySchema = new Schema<WeatherHourlyDoc>(
  {
    hour: { type: Date, required: true },
    stationId: { type: Number, required: true },
    tempC: { type: Number, default: null },
    humidityPct: { type: Number, default: null },
    windMs: { type: Number, default: null },
    rainfall3hMm: { type: Number, default: null },
    rainfallDayMm: { type: Number, default: null },
    cloudCoverTenths: { type: Number, default: null },
  },
  { collection: 'weather_hourly' },
);

WeatherHourlySchema.index({ hour: 1, stationId: 1 }, { unique: true });

export const WeatherHourly = model<WeatherHourlyDoc>(
  'WeatherHourly',
  WeatherHourlySchema,
);
