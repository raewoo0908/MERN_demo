import { connectLocal, disconnect } from '../lib/db.js';
import { HourlyUsage } from '../models/HourlyUsage.js';
import { finalizeMetrics, printSample, replaceCollection, sumTripCount } from './lib.js';

interface Out {
  dow: number;
  hour: number;
  gender: 'M' | 'F' | null;
  ageGroup: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

async function run() {
  await connectLocal();
  console.log('Aggregating agg_demographic_hour from hourly_usage…');
  const start = Date.now();

  const rows = await HourlyUsage.aggregate<{
    _id: { dow: number; hour: number; gender: 'M' | 'F' | null; ageGroup: string };
    tripCount: number;
    distanceM: number;
    durationMin: number;
  }>([
    {
      $group: {
        _id: {
          dow: {
            $subtract: [
              { $dayOfWeek: { date: '$bucketStart', timezone: 'Asia/Seoul' } },
              1,
            ],
          },
          hour: '$hour',
          gender: '$gender',
          ageGroup: '$ageGroup',
        },
        tripCount: { $sum: '$tripCount' },
        distanceM: { $sum: '$distanceM' },
        durationMin: { $sum: '$durationMin' },
      },
    },
    { $sort: { '_id.dow': 1, '_id.hour': 1, '_id.gender': 1, '_id.ageGroup': 1 } },
  ]).allowDiskUse(true);

  const docs: Out[] = rows.map((r) => ({
    dow: r._id.dow,
    hour: r._id.hour,
    gender: r._id.gender ?? null,
    ageGroup: r._id.ageGroup,
    ...finalizeMetrics(r),
  }));

  await replaceCollection('agg_demographic_hour', docs);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\ndone: ${docs.length} rows, sum(tripCount)=${sumTripCount(docs).toLocaleString()} (${elapsed}s)`,
  );
  printSample('agg_demographic_hour', docs);
  await disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
