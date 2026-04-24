import path from 'node:path';
import { connectLocal, disconnect } from '../lib/db.js';
import { iterateCsv } from '../lib/csv.js';
import { toNumber, normalizeStationNumber } from '../lib/clean.js';
import { printSample, replaceCollection } from './lib.js';

const FILES = [
  path.resolve('data', 'tbCycleRentData_202511.csv'),
  path.resolve('data', 'tbCycleRentData_202512.csv'),
];

interface Row {
  '자전거번호': string;
  '대여일시': string;
  '대여 대여소번호': string;
  '대여 대여소명': string;
  '대여거치대': string;
  '반납일시': string;
  '반납대여소번호': string;
  '반납대여소명': string;
  '반납거치대': string;
  '이용시간(분)': string;
  '이용거리(M)': string;
  '생년': string;
  '성별': string;
  '이용자종류': string;
}

type Bucket = 'AM_commute' | 'PM_commute' | 'weekend';

function classifyBucket(dow: number, hour: number): Bucket | null {
  // dow: 0=Sun, 1=Mon, ..., 6=Sat
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend) return 'weekend';

  // "화~금" (Tue–Fri) commute windows per day 3 plan.
  const isTueToFri = dow >= 2 && dow <= 5;
  if (!isTueToFri) return null;
  if (hour >= 7 && hour < 10) return 'AM_commute';
  if (hour >= 17 && hour < 20) return 'PM_commute';
  return null;
}

function durationBucket(mins: number): string {
  if (mins < 1) return 'outlier_low';
  if (mins > 600) return 'outlier_high';
  if (mins < 5) return '0-5';
  if (mins < 10) return '5-10';
  if (mins < 15) return '10-15';
  if (mins < 20) return '15-20';
  if (mins < 30) return '20-30';
  if (mins < 60) return '30-60';
  return '60+';
}

const DURATION_BUCKET_ORDER = [
  '0-5',
  '5-10',
  '10-15',
  '15-20',
  '20-30',
  '30-60',
  '60+',
  'outlier_low',
  'outlier_high',
];

function ageBucket(age: number): string {
  if (age < 10) return '<10';
  if (age >= 70) return '70+';
  const lo = Math.floor(age / 5) * 5;
  return `${lo}-${lo + 4}`;
}

function parseKstTimestamp(
  s: string | undefined,
): { y: number; m: number; d: number; h: number; dow: number } | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const h = +m[4];
  // KST day of week: since every hour of a KST date shares the same calendar day,
  // we can compute dow from the date parts via a Date constructed in UTC (timezone-agnostic).
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return { y, m: mo, d, h, dow };
}

// Prune a Map<pairKey, count> to top-K by count using array sort.
function pruneTopK(map: Map<string, number>, k: number): void {
  if (map.size <= k) return;
  const arr = Array.from(map.entries());
  // Quickselect-equivalent: partial sort via full sort (k small, infrequent calls).
  arr.sort((a, b) => b[1] - a[1]);
  map.clear();
  for (let i = 0; i < k; i++) {
    const [key, count] = arr[i];
    map.set(key, count);
  }
}

async function processFile(
  file: string,
  acc: {
    od: Record<Bucket, Map<string, number>>;
    duration: Map<string, number>;
    age: Map<string, number>; // key: `${dow}|${hour}|${ageBucket}`
    totalsEligibleDuration: number;
    totalsSelfLoops: number;
    totalsMissingBirth: number;
    totalRows: number;
  },
): Promise<void> {
  console.log(`\nStreaming ${path.basename(file)}`);
  const start = Date.now();
  const PRUNE_EVERY = 100_000;
  const PRUNE_TO = 500;

  let rowsInFile = 0;

  for await (const row of iterateCsv<Row>(file)) {
    acc.totalRows++;
    rowsInFile++;

    const rentTs = parseKstTimestamp(row['대여일시']);
    if (!rentTs) continue;

    const rentStation = normalizeStationNumber(row['대여 대여소번호']);
    const returnStation = normalizeStationNumber(row['반납대여소번호']);
    const durationMin = toNumber(row['이용시간(분)']);

    // (1) agg_od_top — bucketed pair counts
    if (rentStation && returnStation && rentStation !== returnStation) {
      const bucket = classifyBucket(rentTs.dow, rentTs.h);
      if (bucket) {
        const key = `${rentStation}->${returnStation}`;
        const m = acc.od[bucket];
        m.set(key, (m.get(key) ?? 0) + 1);
      }
    } else if (rentStation && returnStation && rentStation === returnStation) {
      acc.totalsSelfLoops++;
    }

    // (2) agg_duration_hist
    if (durationMin !== null) {
      acc.totalsEligibleDuration++;
      const b = durationBucket(durationMin);
      acc.duration.set(b, (acc.duration.get(b) ?? 0) + 1);
    }

    // (3) agg_age_distribution
    const birthYear = toNumber(row['생년']);
    if (birthYear !== null && birthYear >= 1900 && birthYear <= 2025) {
      const age = 2026 - birthYear;
      const ab = ageBucket(age);
      const key = `${rentTs.dow}|${rentTs.h}|${ab}`;
      acc.age.set(key, (acc.age.get(key) ?? 0) + 1);
    } else {
      acc.totalsMissingBirth++;
    }

    // Periodic prune + progress
    if (rowsInFile % PRUNE_EVERY === 0) {
      for (const bucket of ['AM_commute', 'PM_commute', 'weekend'] as Bucket[]) {
        pruneTopK(acc.od[bucket], PRUNE_TO);
      }
      const elapsed = (Date.now() - start) / 1000;
      const rate = (rowsInFile / elapsed).toFixed(0);
      const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
      console.log(
        `  ${rowsInFile.toLocaleString()} rows (${rate}/s, heap ${mem}MB, od sizes: ` +
          `AM=${acc.od.AM_commute.size} PM=${acc.od.PM_commute.size} WE=${acc.od.weekend.size})`,
      );
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  file done: ${rowsInFile.toLocaleString()} rows (${elapsed}s)`);
}

async function run() {
  await connectLocal();

  const acc = {
    od: {
      AM_commute: new Map<string, number>(),
      PM_commute: new Map<string, number>(),
      weekend: new Map<string, number>(),
    },
    duration: new Map<string, number>(),
    age: new Map<string, number>(),
    totalsEligibleDuration: 0,
    totalsSelfLoops: 0,
    totalsMissingBirth: 0,
    totalRows: 0,
  };

  for (const f of FILES) {
    await processFile(f, acc);
  }

  // Build output docs --------------------------------------------------

  const TOP_N = 300;

  const odDocs: Array<{
    bucket: Bucket;
    rank: number;
    rentStation: string;
    returnStation: string;
    tripCount: number;
  }> = [];
  for (const bucket of ['AM_commute', 'PM_commute', 'weekend'] as Bucket[]) {
    const arr = Array.from(acc.od[bucket].entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N);
    arr.forEach(([key, tripCount], i) => {
      const [rentStation, returnStation] = key.split('->');
      odDocs.push({ bucket, rank: i + 1, rentStation, returnStation, tripCount });
    });
  }

  const durationDocs = DURATION_BUCKET_ORDER.map((b) => ({
    bucket: b,
    count: acc.duration.get(b) ?? 0,
  }));

  const ageDocs: Array<{
    dow: number;
    hour: number;
    ageBucket: string;
    count: number;
  }> = [];
  for (const [key, count] of acc.age.entries()) {
    const [dow, hour, ab] = key.split('|');
    ageDocs.push({ dow: +dow, hour: +hour, ageBucket: ab, count });
  }
  ageDocs.sort(
    (a, b) =>
      a.dow - b.dow || a.hour - b.hour || a.ageBucket.localeCompare(b.ageBucket),
  );

  // Write collections --------------------------------------------------

  await replaceCollection('agg_od_top', odDocs);
  await replaceCollection('agg_duration_hist', durationDocs);
  await replaceCollection('agg_age_distribution', ageDocs);

  // Summary ------------------------------------------------------------

  console.log('\n──────────────────────────');
  console.log(`Total rows streamed:       ${acc.totalRows.toLocaleString()}`);
  console.log(`Self-loops skipped (OD):   ${acc.totalsSelfLoops.toLocaleString()}`);
  console.log(`Missing birth year (age):  ${acc.totalsMissingBirth.toLocaleString()}`);
  console.log(`Eligible duration rows:    ${acc.totalsEligibleDuration.toLocaleString()}`);
  console.log(
    `agg_od_top:          ${odDocs.length} docs ` +
      `(AM=${odDocs.filter((d) => d.bucket === 'AM_commute').length} ` +
      `PM=${odDocs.filter((d) => d.bucket === 'PM_commute').length} ` +
      `WE=${odDocs.filter((d) => d.bucket === 'weekend').length})`,
  );
  console.log(`agg_duration_hist:   ${durationDocs.length} docs`);
  console.log(`agg_age_distribution: ${ageDocs.length} docs`);

  printSample('agg_od_top (AM)', odDocs.filter((d) => d.bucket === 'AM_commute'));
  printSample('agg_duration_hist', durationDocs, 10);
  printSample('agg_age_distribution', ageDocs);

  await disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
