import path from 'node:path';
import { connectLocal, disconnect } from './lib/db.js';
import { iterateCsv } from './lib/csv.js';
import { toNumber, extractStationNumberFromName } from './lib/clean.js';
import {
  StationMonthly,
  type StationMonthlyDoc,
} from './models/StationMonthly.js';

const FILE = path.resolve(
  'data',
  'tbCycleStationUseMonthInfo_202507_to_12.csv',
);

interface Row {
  자치구: string;
  대여소명: string;
  기준년월: string;
  대여건수: string;
  반납건수: string;
}

async function main() {
  await connectLocal();
  await StationMonthly.deleteMany({});
  console.log('Cleared station_monthly collection');

  const start = Date.now();
  let inserted = 0;
  let skipped = 0;
  const BATCH = 1000;
  let batch: StationMonthlyDoc[] = [];

  for await (const row of iterateCsv<Row>(FILE)) {
    const num = extractStationNumberFromName(row.대여소명);
    const rent = toNumber(row.대여건수) ?? 0;
    const ret = toNumber(row.반납건수) ?? 0;
    if (!num) {
      skipped++;
      continue;
    }

    batch.push({
      district: (row.자치구 ?? '').trim(),
      stationNumber: num,
      stationName: (row.대여소명 ?? '').trim(),
      yearMonth: (row.기준년월 ?? '').trim(),
      rentCount: rent,
      returnCount: ret,
      netFlow: rent - ret,
    });

    if (batch.length >= BATCH) {
      await StationMonthly.insertMany(batch, { ordered: false });
      inserted += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await StationMonthly.insertMany(batch, { ordered: false });
    inserted += batch.length;
  }

  await StationMonthly.createIndexes();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Inserted ${inserted} rows, skipped ${skipped} (${elapsed}s)`);
  await disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
