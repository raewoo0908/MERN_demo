import type { DurationRow, HourlyRow, StationTotalRow } from '../api/types';
import { cleanStationName, formatInt, formatMinutes } from '../lib/format';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

interface Props {
  hourly: HourlyRow[];
  duration: DurationRow[];
  topStations: StationTotalRow[];
}

const OUTLIER_BUCKETS = new Set(['outlier_low', 'outlier_high']);

export function KpiRow({ hourly, duration, topStations }: Props) {
  const totalTrips = hourly.reduce((s, r) => s + r.tripCount, 0);
  const totalDurationMin = hourly.reduce((s, r) => s + r.durationMin, 0);
  const avgDuration = totalTrips > 0 ? totalDurationMin / totalTrips : 0;

  const topStation = topStations[0];

  const normalDuration = duration.filter((d) => !OUTLIER_BUCKETS.has(d.bucket));
  const mostCommon = normalDuration.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    normalDuration[0] ?? { bucket: '—', count: 0 },
  );
  const normalTotal = normalDuration.reduce((s, r) => s + r.count, 0);
  const mostCommonPct =
    normalTotal > 0 ? ((mostCommon.count / normalTotal) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Total Trips"
        value={formatInt(totalTrips)}
        hint="Nov 1 – Dec 31, 2025"
      />
      <KpiCard
        label="Avg Duration per Trip"
        value={formatMinutes(avgDuration)}
        hint={`Total riding time: ${formatInt(Math.round(totalDurationMin / 60))} hours`}
      />
      <KpiCard
        label="Busiest Station"
        value={topStation ? cleanStationName(topStation.stationName) : '—'}
        hint={topStation ? `${formatInt(topStation.tripCount)} trips` : undefined}
      />
      <KpiCard
        label="Most Common Trip Length"
        value={`${mostCommon.bucket} min`}
        hint={`${mostCommonPct}% of all trips`}
      />
    </div>
  );
}
