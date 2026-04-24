import { connectLocal, disconnect } from '../lib/db.js';
import { HourlyUsage } from '../models/HourlyUsage.js';
import { finalizeMetrics, printSample, replaceCollection, sumTripCount } from './lib.js';

interface Out {
  date: Date;
  hour: number;
  bucketStart: Date;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

async function run() {
  await connectLocal();
  console.log('Aggregating agg_hourly from hourly_usage…');
  const start = Date.now();

  const rows = await HourlyUsage.aggregate<{
    _id: { date: Date; hour: number; bucketStart: Date };
    tripCount: number;
    distanceM: number;
    durationMin: number;
  }>([
    {
      $group: {
        _id: { date: '$date', hour: '$hour', bucketStart: '$bucketStart' },
        tripCount: { $sum: '$tripCount' },
        distanceM: { $sum: '$distanceM' },
        durationMin: { $sum: '$durationMin' },
      },
    },
    { $sort: { '_id.bucketStart': 1 } },
  ]).allowDiskUse(true);

  const docs: Out[] = rows.map((r) => ({
    date: r._id.date,
    hour: r._id.hour,
    bucketStart: r._id.bucketStart,
    ...finalizeMetrics(r),
  }));

  await replaceCollection('agg_hourly', docs);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\ndone: ${docs.length} rows, sum(tripCount)=${sumTripCount(docs).toLocaleString()} (${elapsed}s)`,
  );
  printSample('agg_hourly', docs);
  await disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
