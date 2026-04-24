import { useMemo } from 'react';
import type { HourlyRow } from '../api/types';
import { DOW_LABELS, formatInt } from '../lib/format';

interface Props {
  hourly: HourlyRow[];
}

// Interpolate light → dark blue based on intensity ∈ [0, 1].
function cellColor(intensity: number): string {
  if (intensity === 0) return 'rgb(243, 244, 246)'; // gray-100 — zero
  const t = Math.sqrt(intensity); // gamma-adjust so low values stay visible
  const r = Math.round(239 - t * 200);
  const g = Math.round(246 - t * 150);
  const b = Math.round(255 - t * 50);
  return `rgb(${r}, ${g}, ${b})`;
}

function textColor(intensity: number): string {
  return intensity > 0.55 ? '#fff' : '#374151'; // gray-700
}

export function Heatmap({ hourly }: Props) {
  const { matrix, max } = useMemo(() => {
    const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const row of hourly) {
      // bucketStart is a UTC instant representing KST wall clock; shift to KST then read day.
      const kst = new Date(new Date(row.bucketStart).getTime() + 9 * 3600_000);
      const dow = kst.getUTCDay();
      m[dow][row.hour] += row.tripCount;
    }
    let mx = 0;
    for (const r of m) for (const v of r) if (v > mx) mx = v;
    return { matrix: m, max: mx };
  }, [hourly]);

  return (
    <div className="overflow-x-auto">
      <table
        className="min-w-full border-separate"
        style={{ borderSpacing: 2 }}
        aria-label="요일별 시간대별 이용 건수 히트맵"
      >
        <thead>
          <tr>
            <th scope="col" className="w-10">
              <span className="sr-only">요일</span>
            </th>
            {Array.from({ length: 24 }, (_, h) => (
              <th
                key={h}
                scope="col"
                className="text-[10px] font-medium text-gray-500"
                style={{ minWidth: 28 }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DOW_LABELS.map((label, dow) => (
            <tr key={dow}>
              <th
                scope="row"
                className="pr-2 text-right text-xs font-medium text-gray-600"
              >
                {label}
              </th>
              {matrix[dow].map((value, hour) => {
                const intensity = max > 0 ? value / max : 0;
                const cellLabel = `${label} ${hour}:00 — ${formatInt(value)} trips`;
                return (
                  <td
                    key={hour}
                    role="img"
                    aria-label={cellLabel}
                    title={cellLabel}
                    className="text-center"
                    style={{
                      backgroundColor: cellColor(intensity),
                      color: textColor(intensity),
                      minWidth: 28,
                      height: 24,
                      fontSize: 10,
                      borderRadius: 3,
                    }}
                  >
                    {intensity > 0.35 ? Math.round(value / 1000) + 'k' : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>Low</span>
        <div className="h-2 w-40 rounded bg-gradient-to-r from-gray-100 to-blue-600" />
        <span>High (max ≈ {formatInt(max)} trips/hour)</span>
      </div>
    </div>
  );
}
