import mongoose from 'mongoose';
import { getEnv } from './lib/env.js';

const COLLECTIONS: Array<{ name: string; indexes?: Array<Record<string, 1 | -1>> }> = [
  { name: 'stations', indexes: [{ stationNumber: 1 }] },
  { name: 'weather_hourly', indexes: [{ hour: 1 }] },
  { name: 'agg_hourly', indexes: [{ bucketStart: 1 }] },
  {
    name: 'agg_station_dow_hour',
    indexes: [{ stationNumber: 1 }, { stationNumber: 1, dow: 1, hour: 1 }],
  },
  { name: 'agg_dow_hour_usertype', indexes: [{ dow: 1, hour: 1 }] },
  { name: 'agg_demographic_hour', indexes: [{ dow: 1, hour: 1 }] },
  { name: 'agg_station_total', indexes: [{ stationNumber: 1 }, { tripCount: -1 }] },
  { name: 'agg_monthly_trend', indexes: [{ yearMonth: 1 }, { district: 1 }] },
  { name: 'agg_od_top', indexes: [{ bucket: 1, rank: 1 }] },
  { name: 'agg_duration_hist', indexes: [{ bucket: 1 }] },
  { name: 'agg_age_distribution', indexes: [{ dow: 1, hour: 1 }] },
];

async function copyCollection(
  local: mongoose.Connection,
  atlas: mongoose.Connection,
  name: string,
): Promise<{ copied: number }> {
  const srcDb = local.db;
  const dstDb = atlas.db;
  if (!srcDb || !dstDb) throw new Error('connection not ready');
  const src = srcDb.collection(name);
  const dst = dstDb.collection(name);

  await dst.deleteMany({});

  const total = await src.countDocuments();
  if (total === 0) {
    console.log(`  ${name}: empty in local — skipped`);
    return { copied: 0 };
  }

  const BATCH = 2000;
  let buf: unknown[] = [];
  let copied = 0;
  const start = Date.now();

  const cursor = src.find({}, { projection: { _id: 0 } });
  for await (const doc of cursor) {
    buf.push(doc);
    if (buf.length >= BATCH) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await dst.insertMany(buf as any, { ordered: false });
      copied += buf.length;
      buf = [];
    }
  }
  if (buf.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await dst.insertMany(buf as any, { ordered: false });
    copied += buf.length;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ${name}: ${copied.toLocaleString()} docs in ${elapsed}s`);
  return { copied };
}

async function ensureIndexes(
  atlas: mongoose.Connection,
  name: string,
  indexes: Array<Record<string, 1 | -1>>,
): Promise<void> {
  const db = atlas.db;
  if (!db) throw new Error('atlas connection not ready');
  const col = db.collection(name);
  for (const spec of indexes) {
    await col.createIndex(spec);
  }
}

async function run() {
  const localUri = getEnv('MONGO_URI_LOCAL');
  const atlasUri = getEnv('MONGO_URI_ATLAS');

  console.log('Connecting to local MongoDB…');
  const local = await mongoose.createConnection(localUri).asPromise();
  console.log('Connecting to MongoDB Atlas…');
  const atlas = await mongoose.createConnection(atlasUri).asPromise();

  console.log(`\nCopying ${COLLECTIONS.length} collections → Atlas\n`);

  const results: Array<{ name: string; copied: number }> = [];
  for (const { name } of COLLECTIONS) {
    const r = await copyCollection(local, atlas, name);
    results.push({ name, copied: r.copied });
  }

  console.log('\nCreating indexes on Atlas…');
  for (const { name, indexes } of COLLECTIONS) {
    if (!indexes || indexes.length === 0) continue;
    await ensureIndexes(atlas, name, indexes);
    console.log(`  ${name}: ${indexes.length} index(es)`);
  }

  // Verify counts --------------------------------------------------
  console.log('\nVerification (local vs atlas counts):');
  for (const { name } of COLLECTIONS) {
    const l = await local.db!.collection(name).countDocuments();
    const a = await atlas.db!.collection(name).countDocuments();
    const ok = l === a ? '✓' : '✗';
    console.log(`  ${ok} ${name}: local=${l.toLocaleString()} atlas=${a.toLocaleString()}`);
  }

  await local.close();
  await atlas.close();
  console.log('\nDone.');
}

run().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
