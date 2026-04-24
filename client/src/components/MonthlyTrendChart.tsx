import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyRow } from '../api/types';
import { formatInt } from '../lib/format';

interface Props {
  monthly: MonthlyRow[];
}

const LINE_COLORS = [
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#16a34a', // green-600
  '#f59e0b', // amber-500
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#65a30d', // lime-600
  '#ea580c', // orange-600
  '#475569', // slate-600
];

export function MonthlyTrendChart({ monthly }: Props) {
  const { districts, months, byMonthDistrict, topDefault } = useMemo(() => {
    const districtSet = new Set<string>();
    const monthSet = new Set<string>();
    const map = new Map<string, MonthlyRow>();
    for (const r of monthly) {
      districtSet.add(r.district);
      monthSet.add(r.yearMonth);
      map.set(`${r.yearMonth}|${r.district}`, r);
    }
    const ds = Array.from(districtSet).sort();
    const ms = Array.from(monthSet).sort();

    // Pick top 5 by the earliest month's rentCount
    const firstMonth = ms[0];
    const top = ds
      .map((d) => ({ d, v: map.get(`${firstMonth}|${d}`)?.rentCount ?? 0 }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5)
      .map((x) => x.d);

    return { districts: ds, months: ms, byMonthDistrict: map, topDefault: top };
  }, [monthly]);

  const [selected, setSelected] = useState<string[]>(topDefault);

  const toggle = (d: string) => {
    setSelected((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= 10) return prev;
      return [...prev, d];
    });
  };

  const chartData = useMemo(() => {
    return months.map((ym) => {
      const row: Record<string, number | string> = { yearMonth: ym };
      for (const d of selected) {
        row[d] = byMonthDistrict.get(`${ym}|${d}`)?.rentCount ?? 0;
      }
      if (selected.length === 1) {
        row.netFlow = byMonthDistrict.get(`${ym}|${selected[0]}`)?.netFlow ?? 0;
      }
      return row;
    });
  }, [months, selected, byMonthDistrict]);

  const showNetFlow = selected.length === 1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="mr-1 font-medium text-gray-600">자치구 (1~10):</span>
        {districts.map((d) => {
          const isOn = selected.includes(d);
          const disabled = !isOn && selected.length >= 10;
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              disabled={disabled}
              className={`rounded-full border px-2 py-0.5 transition ${
                isOn
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {showNetFlow && (
        <div className="mb-2 flex items-center gap-3 text-[11px] text-gray-600">
          <span className="font-medium">막대 (netFlow = 대여 − 반납):</span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ backgroundColor: '#ef4444', opacity: 0.7 }}
            />
            순유출(+) · 다른 구로 타고 나감
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ backgroundColor: '#10b981', opacity: 0.7 }}
            />
            순유입(−) · 이 구로 타고 들어옴
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="yearMonth"
            tick={{ fontSize: 11, fill: '#374151' }}
            tickFormatter={(ym: string) => ym.replace(/^(\d{4})(\d{2})$/, '$2/$1')}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          {showNetFlow && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
            />
          )}
          <Tooltip
            formatter={(v: number, name: string) => {
              if (name === 'netFlow') {
                const label = v >= 0 ? '순유출(+)' : '순유입(−)';
                return [formatInt(Math.abs(v)), label];
              }
              return [formatInt(v), name];
            }}
            labelFormatter={(ym: string) =>
              ym.replace(/^(\d{4})(\d{2})$/, '$2월 $1')
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {selected.map((d, i) => (
            <Line
              key={d}
              yAxisId="left"
              type="monotone"
              dataKey={d}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
          {showNetFlow && (
            <Bar
              yAxisId="right"
              dataKey="netFlow"
              fillOpacity={0.7}
              barSize={20}
            >
              {chartData.map((d, i) => {
                const v = (d.netFlow as number) ?? 0;
                return (
                  <Cell key={i} fill={v >= 0 ? '#ef4444' : '#10b981'} />
                );
              })}
            </Bar>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
