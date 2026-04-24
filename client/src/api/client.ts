import type {
  ApiEnvelope,
  AgeRow,
  DemographicRow,
  DurationRow,
  HourlyRow,
  MonthlyRow,
  OdBucket,
  OdRow,
  StationDowHourRow,
  StationRow,
  StationTotalRow,
  UsertypeRow,
  WeatherRow,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const api = {
  health: () =>
    getJson<{ status: string; timestamp: string }>('/api/health'),

  hourly: (from?: string, to?: string) =>
    getJson<ApiEnvelope<HourlyRow>>(`/api/hourly${buildQuery({ from, to })}`),

  stations: () => getJson<ApiEnvelope<StationRow>>('/api/stations'),

  stationsTop: (limit = 50) =>
    getJson<ApiEnvelope<StationTotalRow> & { limit: number }>(
      `/api/stations/top${buildQuery({ limit })}`,
    ),

  stationPattern: (stationNumber: string) =>
    getJson<ApiEnvelope<StationDowHourRow> & { stationNumber: string }>(
      `/api/stations/${encodeURIComponent(stationNumber)}/pattern`,
    ),

  weather: (from?: string, to?: string) =>
    getJson<ApiEnvelope<WeatherRow>>(`/api/weather${buildQuery({ from, to })}`),

  usertype: () => getJson<ApiEnvelope<UsertypeRow>>('/api/usertype'),

  demographic: () => getJson<ApiEnvelope<DemographicRow>>('/api/demographic'),

  age: () => getJson<ApiEnvelope<AgeRow>>('/api/age'),

  monthly: (district?: string) =>
    getJson<ApiEnvelope<MonthlyRow>>(`/api/monthly${buildQuery({ district })}`),

  od: (bucket: OdBucket, limit = 100) =>
    getJson<ApiEnvelope<OdRow> & { bucket: OdBucket; limit: number }>(
      `/api/od${buildQuery({ bucket, limit })}`,
    ),

  duration: () => getJson<ApiEnvelope<DurationRow>>('/api/duration'),
};
