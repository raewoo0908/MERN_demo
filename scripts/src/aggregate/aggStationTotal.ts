import { connectLocal, disconnect } from '../lib/db.js';
import { HourlyUsage } from '../models/HourlyUsage.js';
import { finalizeMetrics, printSample, replaceCollection, sumTripCount } from './lib.js';

interface Out {
  stationNumber: string;
  stationName: string;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

async function run() {
  await connectLocal();
  console.log('Aggregating agg_station_total from hourly_usage…');
  const start = Date.now();

  const rows = await HourlyUsage.aggregate<{
    _id: string;
    stationName: string;
    tripCount: number;
    distanceM: number;
    durationMin: number;
  }>([
    {
      $group: {
        _id: '$stationNumber',
        stationName: { $first: '$stationName' },
        tripCount: { $sum: '$tripCount' },
        distanceM: { $sum: '$distanceM' },
        durationMin: { $sum: '$durationMin' },
      },
    },
    { $sort: { tripCount: -1 } },
  ]).allowDiskUse(true);

  const docs: Out[] = rows.map((r) => ({
    stationNumber: r._id,
    stationName: r.stationName,
    ...finalizeMetrics(r),
  }));

  await replaceCollection('agg_station_total', docs);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\ndone: ${docs.length} rows, sum(tripCount)=${sumTripCount(docs).toLocaleString()} (${elapsed}s)`,
  );
  printSample('agg_station_total', docs);
  await disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
