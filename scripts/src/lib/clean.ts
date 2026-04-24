const KMA_SENTINELS = new Set([-9, -99, -9.0, -99.0]);
const NULL_TOKENS = new Set(['', '\\N', 'NULL', 'null', '-']);

export function toNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (NULL_TOKENS.has(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function toKmaNumber(value: string | number | undefined | null): number | null {
  const n = toNumber(value);
  if (n === null) return null;
  if (KMA_SENTINELS.has(n)) return null;
  return n;
}

export function toText(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  if (NULL_TOKENS.has(trimmed)) return null;
  return trimmed;
}

export function normalizeStationNumber(raw: string | null | undefined): string | null {
  // "00949" → "00949", "949" → "00949". Returns null for unrecognized formats.
  if (!raw) return null;
  const m = raw.trim().match(/^0*(\d{1,5})$/);
  return m ? m[1].padStart(5, '0') : null;
}

export function extractStationNumberFromName(name: string | null | undefined): string | null {
  // "108. 서교동 사거리" → "00108"
  if (!name) return null;
  const m = name.match(/^\s*(\d{1,5})\./);
  return m ? m[1].padStart(5, '0') : null;
}

export function cleanStationName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.replace(/^\s*\d{1,5}\.\s*/, '').trim();
}
