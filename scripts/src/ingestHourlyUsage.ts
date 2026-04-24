import path from 'node:path';
import { connectLocal, disconnect } from './lib/db.js';
import { iterateCsv } from './lib/csv.js';
import { toNumber, normalizeStationNumber } from './lib/clean.js';
import { parseKstDate } from './lib/time.js';
import { HourlyUsage, type HourlyUsageDoc } from './models/HourlyUsage.js';

const FILES = [
  path.resolve('data', 'tbCycleRentUseTimeInfo_202511.csv'),
  path.resolve('data', 'tbCycleRentUseTimeInfo_202512.csv'),
];

interface Row {
  대여일자: string;
  대여시간: string;
  대여소번호: string;
  대여소명: string;
  대여구분코드: string;
  성별: string;
  연령대코드: string;
  이용건수: string;
  운동량: string;
  탄소량: string;
  '이동거리(M)': string;
  '이용시간(분)': string;
}

function normalizeGender(raw: string | undefined): 'M' | 'F' | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase();
  if (t === 'M') return 'M';
  if (t === 'F') return 'F';
  return null;
}

async function ingestFile(file: string): Promise<{ inserted: number; skipped: number }> {
  console.log(`\nParsing ${path.basename(file)}`);
  const start = Date.now();

  const BATCH = 5000;
  let batch: HourlyUsageDoc[] = [];
  let inserted = 0;
  let skipped = 0;

  for await (const row of iterateCsv<Row>(file)) {
    const stationNumber = normalizeStationNumber(row.대여소번호);
    const hour = toNumber(row.대여시간);
    const tripCount = toNumber(row.이용건수);
    if (!stationNumber || hour === null || tripCount === null) {
      skipped++;
      continue;
    }
    const date = parseKstDate(row.대여일자);
    const bucketStart = parseKstDate(row.대여일자, hour);

    batch.push({
      date,
      hour,
      bucketStart,
      stationNumber,
      stationName: (row.대여소명 ?? '').trim(),
      userType: (row.대여구분코드 ?? '').trim(),
      gender: normalizeGender(row.성별),
      ageGroup: (row.연령대코드 ?? '').trim() || '미상',
      tripCount,
      exerciseKcal: toNumber(row.운동량) ?? 0,
      carbonKg: toNumber(row.탄소량) ?? 0,
      distanceM: toNumber(row['이동거리(M)']) ?? 0,
      durationMin: toNumber(row['이용시간(분)']) ?? 0,
    });

    if (batch.length >= BATCH) {
      await HourlyUsage.insertMany(batch, { ordered: false });
      inserted += batch.length;
      if (inserted % 100_000 === 0) {
        const elapsed = (Date.now() - start) / 1000;
        const rate = (inserted / elapsed).toFixed(0);
        console.log(`  ${inserted.toLocaleString()} rows (${rate} rows/s)`);
      }
      batch = [];
    }
  }
  if (batch.length) {
    await HourlyUsage.insertMany(batch, { ordered: false });
    inserted += batch.length;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  done: ${inserted.toLocaleString()} inserted, ${skipped} skipped (${elapsed}s)`);
  return { inserted, skipped };
}

async function main() {
  await connectLocal();
  await HourlyUsage.deleteMany({});
  console.log('Cleared hourly_usage collection');

  let totalInserted = 0;
  let totalSkipped = 0;
  for (const f of FILES) {
    const r = await ingestFile(f);
    totalInserted += r.inserted;
    totalSkipped += r.skipped;
  }

  console.log('\nBuilding indexes…');
  await HourlyUsage.createIndexes();

  console.log(
    `\nTotal: ${totalInserted.toLocaleString()} inserted, ${totalSkipped} skipped`,
  );
  await disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
