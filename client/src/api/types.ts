// Response shapes mirror server/src/routes/*.ts. Keep in sync.

export interface ApiEnvelope<T> {
  count: number;
  data: T[];
}

export interface HourlyRow {
  date: string;
  hour: number;
  bucketStart: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

export interface StationRow {
  stationNumber: string;
  name: string;
  nameFull: string;
  lat: number;
  lng: number;
  rackCount: number;
  district?: string;
}

export interface StationTotalRow {
  stationNumber: string;
  stationName: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

export interface StationDowHourRow {
  stationNumber: string;
  dow: number;
  hour: number;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

export interface WeatherRow {
  hour: string;
  stationId: number;
  tempC: number | null;
  humidityPct: number | null;
  windMs: number | null;
  rainfall3hMm: number | null;
  rainfallDayMm: number | null;
  cloudCoverTenths: number | null;
}

export interface UsertypeRow {
  dow: number;
  hour: number;
  userType: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

export interface DemographicRow {
  dow: number;
  hour: number;
  gender: 'M' | 'F' | null;
  ageGroup: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

export interface AgeRow {
  dow: number;
  hour: number;
  ageBucket: string;
  count: number;
}

export interface MonthlyRow {
  district: string;
  yearMonth: string;
  rentCount: number;
  returnCount: number;
  netFlow: number;
  stationCount: number;
}

export type OdBucket = 'AM_commute' | 'PM_commute' | 'weekend';

export interface OdRow {
  bucket: OdBucket;
  rank: number;
  rentStation: string;
  returnStation: string;
  tripCount: number;
}

export interface DurationRow {
  bucket: string;
  count: number;
}
