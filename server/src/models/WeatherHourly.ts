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
    tempC: Number,
    humidityPct: Number,
    windMs: Number,
    rainfall3hMm: Number,
    rainfallDayMm: Number,
    cloudCoverTenths: Number,
  },
  { collection: 'weather_hourly', strict: false },
);

export const WeatherHourly = model<WeatherHourlyDoc>(
  'WeatherHourly',
  WeatherHourlySchema,
);
