import { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { OdBucket, OdRow, StationRow, StationTotalRow } from '../../api/types';
import { api, ApiError } from '../../api/client';
import { cleanStationName, formatInt } from '../../lib/format';

interface Props {
  stations: StationRow[];
  topStations: StationTotalRow[];
  selectedStation: string | null;
  onSelect: (stationNumber: string | null) => void;
}

// Quartile-based blue gradient palette (light → dark)
const QUARTILE_COLORS = ['#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'];

function colorForCount(count: number, quartiles: number[]): string {
  for (let i = 0; i < quartiles.length; i++) {
    if (count <= quartiles[i]) return QUARTILE_COLORS[i];
  }
  return QUARTILE_COLORS[QUARTILE_COLORS.length - 1];
}

function computeQuartiles(values: number[]): number[] {
  if (values.length === 0) return [0, 0, 0, 0];
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return [pick(0.2), pick(0.4), pick(0.6), pick(0.8)];
}

const OD_BUCKET_META: Record<OdBucket | 'off', { label: string; color: string }> = {
  off: { label: 'Off', color: '#000' },
  AM_commute: { label: '출근 (AM)', color: '#ea580c' },
  PM_commute: { label: '퇴근 (PM)', color: '#7c3aed' },
  weekend: { label: '주말', color: '#16a34a' },
};

type OdMode = OdBucket | 'off';

// Tiny helper to trigger an invalidateSize after mount — fixes sizing in flex layouts
function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export function StationMap({ stations, topStations, selectedStation, onSelect }: Props) {
  const [odMode, setOdMode] = useState<OdMode>('off');
  const [odRows, setOdRows] = useState<OdRow[]>([]);
  const [odLoading, setOdLoading] = useState(false);
  const [odError, setOdError] = useState<string | null>(null);

  // Build stationNumber → {lat,lng, name} lookup
  const stationMap = useMemo(() => {
    const m = new Map<string, StationRow>();
    for (const s of stations) m.set(s.stationNumber, s);
    return m;
  }, [stations]);

  // Build tripCount lookup from topStations (up to 500)
  const { tripByStation, maxTrip, quartiles } = useMemo(() => {
    const m = new Map<string, number>();
    let mx = 0;
    for (const t of topStations) {
      m.set(t.stationNumber, t.tripCount);
      if (t.tripCount > mx) mx = t.tripCount;
    }
    const q = computeQuartiles(Array.from(m.values()));
    return { tripByStation: m, maxTrip: mx, quartiles: q };
  }, [topStations]);

  // Fetch OD when bucket changes
  useEffect(() => {
    if (odMode === 'off') {
      setOdRows([]);
      return;
    }
    setOdLoading(true);
    setOdError(null);
    api
      .od(odMode, 50)
      .then((res) => setOdRows(res.data))
      .catch((e) => setOdError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setOdLoading(false));
  }, [odMode]);

  // Compute OD polyline data with coordinate lookup; skip missing-station pairs
  const odLines = useMemo(() => {
    if (odRows.length === 0) return { lines: [], skipped: 0, maxCount: 0 };
    let skipped = 0;
    let mx = 0;
    const lines: {
      from: [number, number];
      to: [number, number];
      fromName: string;
      toName: string;
      count: number;
    }[] = [];
    for (const r of odRows) {
      const a = stationMap.get(r.rentStation);
      const b = stationMap.get(r.returnStation);
      if (!a || !b) {
        skipped++;
        if (skipped <= 3) {
          console.warn('[OD] missing station coords:', r.rentStation, '→', r.returnStation);
        }
        continue;
      }
      lines.push({
        from: [a.lat, a.lng],
        to: [b.lat, b.lng],
        fromName: a.name,
        toName: b.name,
        count: r.tripCount,
      });
      if (r.tripCount > mx) mx = r.tripCount;
    }
    if (skipped > 0) {
      console.warn(
        `[OD] ${skipped}/${odRows.length} pairs skipped due to missing station master`,
      );
    }
    return { lines, skipped, maxCount: mx };
  }, [odRows, stationMap]);

  const markers = useMemo(() => {
    return stations.map((s) => {
      const trips = tripByStation.get(s.stationNumber) ?? 0;
      const ratio = maxTrip > 0 ? trips / maxTrip : 0;
      const radius = 3 + 12 * Math.sqrt(ratio);
      const color = trips > 0 ? colorForCount(trips, quartiles) : '#cbd5e1';
      return { station: s, trips, radius, color };
    });
  }, [stations, tripByStation, maxTrip, quartiles]);

  return (
    <div className="relative">
      <div className="relative h-[420px] overflow-hidden rounded-lg border border-gray-200 md:h-[560px]">
        <MapContainer
          center={[37.55, 127.0]}
          zoom={11}
          preferCanvas={true}
          style={{ height: '100%', width: '100%' }}
        >
          <InvalidateOnMount />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {markers.map(({ station, trips, radius, color }) => {
            const isSelected = selectedStation === station.stationNumber;
            return (
              <CircleMarker
                key={station.stationNumber}
                center={[station.lat, station.lng]}
                radius={radius}
                pathOptions={{
                  color: isSelected ? '#dc2626' : color,
                  fillColor: color,
                  fillOpacity: 0.7,
                  weight: isSelected ? 2.5 : 1,
                }}
                eventHandlers={{
                  click: () => onSelect(station.stationNumber),
                }}
              >
                {/* Tooltip handled by browser via pathOptions; use a minimal inline */}
              </CircleMarker>
            );
          })}

          {odLines.lines.map((l, i) => {
            const thick = 1 + 4 * (odLines.maxCount > 0 ? l.count / odLines.maxCount : 0);
            const color =
              odMode !== 'off' ? OD_BUCKET_META[odMode].color : '#000';
            return (
              <Polyline
                key={i}
                positions={[l.from, l.to]}
                pathOptions={{ color, weight: thick, opacity: 0.55 }}
              />
            );
          })}
        </MapContainer>

        {/* OD toggle overlay (top-right, avoiding Leaflet zoom control on top-left) */}
        <div className="absolute right-3 top-3 z-[500] rounded-md border border-gray-300 bg-white/95 p-2 shadow-sm backdrop-blur">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            OD Top 50
          </div>
          <div className="inline-flex rounded-md border border-gray-300 text-xs">
            {(['off', 'AM_commute', 'PM_commute', 'weekend'] as OdMode[]).map((m, i, arr) => (
              <button
                key={m}
                type="button"
                onClick={() => setOdMode(m)}
                className={`px-2 py-1 transition ${
                  odMode === m
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                } ${i === 0 ? 'rounded-l-md' : ''} ${
                  i === arr.length - 1 ? 'rounded-r-md' : ''
                }`}
              >
                {OD_BUCKET_META[m].label}
              </button>
            ))}
          </div>
          {odLoading && (
            <div className="mt-1 text-[10px] text-gray-500">loading…</div>
          )}
          {odError && (
            <div className="mt-1 text-[10px] text-red-600">{odError}</div>
          )}
          {odMode !== 'off' && odLines.skipped > 0 && !odLoading && (
            <div className="mt-1 text-[10px] text-amber-600">
              {odLines.skipped} pairs skipped (missing coords)
            </div>
          )}
        </div>

        {/* Legend (bottom-right) */}
        <div className="absolute bottom-3 right-3 z-[500] rounded-md border border-gray-300 bg-white/95 p-2 text-[10px] shadow-sm backdrop-blur">
          <div className="mb-1 font-semibold uppercase tracking-wider text-gray-500">
            Trips (Top 500)
          </div>
          <div className="flex items-center gap-1">
            {QUARTILE_COLORS.map((c) => (
              <span
                key={c}
                className="h-3 w-5"
                style={{ backgroundColor: c, display: 'inline-block' }}
              />
            ))}
          </div>
          <div className="mt-0.5 flex justify-between text-gray-500">
            <span>low</span>
            <span>high</span>
          </div>
        </div>
      </div>

      {selectedStation && (
        <div className="mt-1 text-xs text-gray-500">
          선택된 역:{' '}
          <span className="font-medium text-gray-700">
            {cleanStationName(stationMap.get(selectedStation)?.name ?? '')}
          </span>
          {' · '}
          <span>
            {formatInt(tripByStation.get(selectedStation) ?? 0)} trips (Top500 기준)
          </span>
        </div>
      )}
    </div>
  );
}
