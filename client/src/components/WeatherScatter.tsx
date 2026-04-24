import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyRow, WeatherRow } from '../api/types';
import { formatInt } from '../lib/format';
import { pearson } from '../lib/stats';

type WeatherVar = 'tempC' | 'humidityPct' | 'rainfall3hMm';

interface Props {
  hourly: HourlyRow[];
  weather: WeatherRow[];
}

const VAR_META: Record<WeatherVar, { label: string; unit: string }> = {
  tempC: { label: '기온', unit: '°C' },
  humidityPct: { label: '습도', unit: '%' },
  rainfall3hMm: { label: '3시간 강수량', unit: 'mm' },
};

export function WeatherScatter({ hourly, weather }: Props) {
  const [xVar, setXVar] = useState<WeatherVar>('tempC');

  // Aggregate hourly data by bucketStart UTC instant (sum tripCount per hour across stations/demog)
  const tripByHour = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of hourly) {
      const t = new Date(r.bucketStart).getTime();
      m.set(t, (m.get(t) ?? 0) + r.tripCount);
    }
    return m;
  }, [hourly]);

  const { points, r } = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (const w of weather) {
      const v = w[xVar];
      if (v === null || v === undefined) continue;
      const t = new Date(w.hour).getTime();
      const trips = tripByHour.get(t);
      if (trips === undefined) continue;
      pts.push({ x: v, y: trips });
    }
    const rr = pearson(
      pts.map((p) => p.x),
      pts.map((p) => p.y),
    );
    return { points: pts, r: rr };
  }, [weather, xVar, tripByHour]);

  const meta = VAR_META[xVar];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-gray-300 bg-white text-xs">
          {(Object.keys(VAR_META) as WeatherVar[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setXVar(v)}
              className={`px-3 py-1 transition ${
                xVar === v
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${v === 'tempC' ? 'rounded-l-md' : ''} ${
                v === 'rainfall3hMm' ? 'rounded-r-md' : ''
              }`}
            >
              {VAR_META[v].label}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            r = {r.toFixed(2)}
          </span>
          <span> (n={formatInt(points.length)})</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name={meta.label}
            tick={{ fontSize: 11, fill: '#374151' }}
            label={{
              value: `${meta.label} (${meta.unit})`,
              position: 'insideBottom',
              offset: -8,
              style: { fontSize: 11, fill: '#6b7280' },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="시간당 이용건수"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(val: number, name: string) => {
              if (name === '시간당 이용건수') return [formatInt(val), name];
              return [`${val.toFixed(1)} ${meta.unit}`, meta.label];
            }}
          />
          <Scatter data={points} fill="#3b82f6" fillOpacity={0.45} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
