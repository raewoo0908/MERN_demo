import mongoose from 'mongoose';
import { getEnv } from './lib/env.js';

const COLLECTIONS = [
  'stations',
  'weather_hourly',
  'agg_hourly',
  'agg_station_dow_hour',
  'agg_dow_hour_usertype',
  'agg_demographic_hour',
  'agg_station_total',
  'agg_monthly_trend',
  'agg_od_top',
  'agg_duration_hist',
  'agg_age_distribution',
];

async function run() {
  const atlasUri = getEnv('MONGO_URI_ATLAS');
  console.log('Connecting to Atlas…');
  const atlas = await mongoose.createConnection(atlasUri).asPromise();
  const db = atlas.db;
  if (!db) throw new Error('atlas connection not ready');

  console.log(`\nAtlas database: ${db.databaseName}\n`);
  console.log('Collection counts:');
  for (const name of COLLECTIONS) {
    try {
      const count = await db.collection(name).countDocuments();
      const mark = count > 0 ? '✓' : '✗';
      console.log(`  ${mark} ${name.padEnd(28)} ${count.toLocaleString()}`);
    } catch (err) {
      console.log(`  ✗ ${name.padEnd(28)} error: ${(err as Error).message}`);
    }
  }

  await atlas.close();
}

run().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
