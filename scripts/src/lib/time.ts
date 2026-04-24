/**
 * KST (UTC+9) helpers. All Date instances in Mongo represent KST wall-clock
 * times converted to UTC instants. Analysis never crosses timezones because
 * the dataset is Seoul-local.
 */

export function toUtcFromKstWallClock(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  // KST = UTC+9, so UTC = KST - 9 hours.
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

export function parseKstDate(dateStr: string, hour = 0): Date {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Invalid date format (expected YYYY-MM-DD): ${dateStr}`);
  return toUtcFromKstWallClock(Number(m[1]), Number(m[2]), Number(m[3]), hour);
}

export function formatKmaTm(date: Date): string {
  // Format a UTC Date as KST wall clock YYYYMMDDHHMM for KMA API.
  const kst = new Date(date.getTime() + 9 * 3600_000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  const h = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${y}${m}${d}${h}${mi}`;
}

export function eachHour(start: Date, end: Date): Date[] {
  const hours: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 3600_000) {
    hours.push(new Date(t));
  }
  return hours;
}

export function chunkHourRange(
  start: Date,
  end: Date,
  chunkDays: number,
): Array<[Date, Date]> {
  const out: Array<[Date, Date]> = [];
  const chunkMs = chunkDays * 24 * 3600_000;
  let cur = start;
  while (cur.getTime() <= end.getTime()) {
    const candidateEnd = new Date(cur.getTime() + chunkMs - 3600_000);
    const chunkEnd = candidateEnd.getTime() > end.getTime() ? end : candidateEnd;
    out.push([cur, chunkEnd]);
    cur = new Date(chunkEnd.getTime() + 3600_000);
  }
  return out;
}
