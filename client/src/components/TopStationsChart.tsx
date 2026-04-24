import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StationTotalRow } from '../api/types';
import { cleanStationName, formatInt } from '../lib/format';

interface Props {
  topStations: StationTotalRow[];
}

export function TopStationsChart({ topStations }: Props) {
  const data = topStations.map((s) => ({
    name: cleanStationName(s.stationName),
    tripCount: s.tripCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#374151' }}
          width={180}
          interval={0}
        />
        <Tooltip
          formatter={(v: number) => [formatInt(v), 'Trips']}
          cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
        />
        <Bar dataKey="tripCount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
