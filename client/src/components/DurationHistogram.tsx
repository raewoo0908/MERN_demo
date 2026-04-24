import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DurationRow } from '../api/types';
import { formatInt } from '../lib/format';

interface Props {
  duration: DurationRow[];
}

const BUCKET_LABELS: Record<string, string> = {
  '0-5': '<5',
  '5-10': '5–10',
  '10-15': '10–15',
  '15-20': '15–20',
  '20-30': '20–30',
  '30-60': '30–60',
  '60+': '60+',
  outlier_low: '<1',
  outlier_high: '>600',
};

const OUTLIER_BUCKETS = new Set(['outlier_low', 'outlier_high']);

export function DurationHistogram({ duration }: Props) {
  const data = duration.map((d) => ({
    bucket: BUCKET_LABELS[d.bucket] ?? d.bucket,
    rawBucket: d.bucket,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: '#374151' }}
          label={{
            value: 'Duration (min)',
            position: 'insideBottom',
            offset: -4,
            style: { fontSize: 11, fill: '#6b7280' },
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <Tooltip
          formatter={(v: number) => [formatInt(v), 'Trips']}
          cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.rawBucket}
              fill={OUTLIER_BUCKETS.has(d.rawBucket) ? '#f87171' : '#3b82f6'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
