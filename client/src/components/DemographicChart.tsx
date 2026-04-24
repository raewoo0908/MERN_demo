import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DemographicRow } from '../api/types';
import { formatInt } from '../lib/format';

interface Props {
  demographic: DemographicRow[];
}

// Raw API values (Korean) in display order, mapped to English labels for the chart.
const AGE_ORDER = ['~10대', '20대', '30대', '40대', '50대', '60대', '70대이상'];
const AGE_LABEL: Record<string, string> = {
  '~10대': 'Under 20',
  '20대': '20s',
  '30대': '30s',
  '40대': '40s',
  '50대': '50s',
  '60대': '60s',
  '70대이상': '70+',
};
const AGE_SET = new Set(AGE_ORDER);

export function DemographicChart({ demographic }: Props) {
  const { data, totalM, totalF, totalUnknown, grandTotal } = useMemo(() => {
    const byAge = new Map<string, { M: number; F: number }>();
    for (const a of AGE_ORDER) byAge.set(a, { M: 0, F: 0 });
    let tM = 0;
    let tF = 0;
    let unknown = 0; // gender null or age '기타'
    for (const r of demographic) {
      if (!AGE_SET.has(r.ageGroup) || r.gender === null) {
        unknown += r.tripCount;
        continue;
      }
      const entry = byAge.get(r.ageGroup)!;
      if (r.gender === 'M') {
        entry.M += r.tripCount;
        tM += r.tripCount;
      } else {
        entry.F += r.tripCount;
        tF += r.tripCount;
      }
    }
    const d = AGE_ORDER.map((age) => ({
      ageGroup: AGE_LABEL[age],
      Male: byAge.get(age)!.M,
      Female: byAge.get(age)!.F,
    }));
    return {
      data: d,
      totalM: tM,
      totalF: tF,
      totalUnknown: unknown,
      grandTotal: tM + tF + unknown,
    };
  }, [demographic]);

  const mPct = grandTotal > 0 ? ((totalM / grandTotal) * 100).toFixed(1) : '0';
  const fPct = grandTotal > 0 ? ((totalF / grandTotal) * 100).toFixed(1) : '0';
  const unknownPct =
    grandTotal > 0 ? ((totalUnknown / grandTotal) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="mb-3 text-xs text-gray-500">
        <span className="font-medium text-blue-700">Male {mPct}%</span>
        <span className="mx-1">·</span>
        <span className="font-medium text-pink-600">Female {fPct}%</span>
        <span className="mx-1 text-gray-400">·</span>
        <span className="text-gray-400">
          Unknown gender/age {unknownPct}% (excluded from chart)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
          barCategoryGap="15%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="ageGroup"
            tick={{ fontSize: 11, fill: '#374151' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            formatter={(v: number, name: string) => [formatInt(v), name]}
            cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Male" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Female" fill="#ec4899" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
