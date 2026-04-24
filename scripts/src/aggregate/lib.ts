import mongoose from 'mongoose';

export const KST_OFFSET_MS = 9 * 3600_000;

export function kstDowFromUtc(utcInstant: Date): number {
  return new Date(utcInstant.getTime() + KST_OFFSET_MS).getUTCDay();
}

export interface AggMetrics {
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

export function finalizeMetrics(m: {
  tripCount: number;
  distanceM: number;
  durationMin: number;
}): AggMetrics {
  return {
    tripCount: m.tripCount,
    distanceM: Math.round(m.distanceM),
    durationMin: Math.round(m.durationMin),
    avgDurationPerTrip: m.tripCount > 0 ? +(m.durationMin / m.tripCount).toFixed(2) : 0,
  };
}

export async function replaceCollection(
  collectionName: string,
  docs: object[],
): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('mongoose not connected');
  const col = db.collection(collectionName);
  await col.deleteMany({});
  if (docs.length === 0) return;

  const BATCH = 5000;
  for (let i = 0; i < docs.length; i += BATCH) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await col.insertMany(docs.slice(i, i + BATCH) as any, { ordered: false });
  }
}

export function printSample<T>(label: string, rows: T[], n = 5): void {
  console.log(`\n${label} — sample ${Math.min(n, rows.length)} of ${rows.length}:`);
  for (const r of rows.slice(0, n)) {
    console.log(' ', JSON.stringify(r));
  }
}

export function sumTripCount(rows: Array<{ tripCount: number }>): number {
  let s = 0;
  for (const r of rows) s += r.tripCount;
  return s;
}
