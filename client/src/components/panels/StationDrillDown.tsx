import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { StationDowHourRow, StationRow, StationTotalRow } from '../../api/types';
import { cleanStationName, formatInt, formatMinutes, DOW_LABELS } from '../../lib/format';

interface Props {
  stationNumber: string;
  stationMaster: StationRow | undefined;
  topEntry: StationTotalRow | undefined;
  onClose: () => void;
}

function cellColor(intensity: number): string {
  if (intensity === 0) return 'rgb(243, 244, 246)';
  const t = Math.sqrt(intensity);
  const r = Math.round(239 - t * 200);
  const g = Math.round(246 - t * 150);
  const b = Math.round(255 - t * 50);
  return `rgb(${r}, ${g}, ${b})`;
}

export function StationDrillDown({ stationNumber, stationMaster, topEntry, onClose }: Props) {
  const [rows, setRows] = useState<StationDowHourRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setError(null);
    api
      .stationPattern(stationNumber)
      .then((res) => setRows(res.data))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          setError('이 역의 dow×hour 집계 없음 (저빈도 역일 수 있음)');
        } else {
          setError(e instanceof ApiError ? e.message : String(e));
        }
      });
  }, [stationNumber]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { matrix, max, totalTrips, totalDurationMin } = useMemo(() => {
    const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let mx = 0;
    let total = 0;
    let durTotal = 0;
    for (const r of rows ?? []) {
      m[r.dow][r.hour] = r.tripCount;
      if (r.tripCount > mx) mx = r.tripCount;
      total += r.tripCount;
      durTotal += r.durationMin;
    }
    return { matrix: m, max: mx, totalTrips: total, totalDurationMin: durTotal };
  }, [rows]);

  const displayName = cleanStationName(stationMaster?.name ?? topEntry?.stationName ?? '');
  const avgDuration = totalTrips > 0 ? totalDurationMin / totalTrips : 0;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-end bg-black/20 sm:items-start"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`역 ${stationNumber} 드릴다운`}
        className="h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-l-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-gray-500">역 #{stationNumber}</div>
            <h3 className="mt-0.5 text-lg font-semibold text-gray-900">
              {displayName || '(이름 없음)'}
            </h3>
            {stationMaster?.district && (
              <div className="mt-0.5 text-xs text-gray-500">
                {stationMaster.district}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            aria-label="드릴다운 패널 닫기"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Trips (Nov–Dec)
            </div>
            <div className="mt-0.5 text-lg font-semibold text-gray-900">
              {formatInt(totalTrips)}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Avg Duration
            </div>
            <div className="mt-0.5 text-lg font-semibold text-gray-900">
              {formatMinutes(avgDuration)}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        {!rows && !error && (
          <div className="text-xs text-gray-500">로딩 중…</div>
        )}

        {rows && rows.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">
              요일 × 시간 패턴 (max {formatInt(max)} trips/hr)
            </div>
            <table className="w-full border-separate" style={{ borderSpacing: 1 }}>
              <thead>
                <tr>
                  <th className="w-6"></th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th
                      key={h}
                      className="text-[8px] font-normal text-gray-400"
                    >
                      {h % 6 === 0 ? h : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOW_LABELS.map((label, dow) => (
                  <tr key={dow}>
                    <th className="pr-1 text-right text-[10px] font-medium text-gray-500">
                      {label}
                    </th>
                    {matrix[dow].map((v, h) => {
                      const intensity = max > 0 ? v / max : 0;
                      const cellLabel = `${label} ${h}:00 — ${formatInt(v)}`;
                      return (
                        <td
                          key={h}
                          role="img"
                          aria-label={cellLabel}
                          title={cellLabel}
                          style={{
                            backgroundColor: cellColor(intensity),
                            height: 14,
                            minWidth: 10,
                            borderRadius: 2,
                          }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-[10px] text-gray-400">
          ESC 또는 바깥 클릭으로 닫기
        </div>
      </div>
    </div>
  );
}
