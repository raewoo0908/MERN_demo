import { connectLocal, disconnect } from '../lib/db.js';
import { HourlyUsage } from '../models/HourlyUsage.js';
import { finalizeMetrics, printSample, replaceCollection, sumTripCount } from './lib.js';

interface Out {
  stationNumber: string;
  dow: number;
  hour: number;
  tripCount: number;
  distanceM: number;
  durationMin: number;
  avgDurationPerTrip: number;
}

async function run() {
  await connectLocal();
  console.log('Aggregating agg_station_dow_hour from hourly_usage…');
  const start = Date.now();

  const rows = await HourlyUsage.aggregate<{
    _id: { stationNumber: string; dow: number; hour: number };
    tripCount: number;
    distanceM: number;
    durationMin: number;
  }>([
    {
      $group: {
        _id: {
          stationNumber: '$stationNumber',
          // MongoDB $dayOfWeek: 1=Sunday..7=Saturday. Subtract 1 to get 0..6 JS convention.
          dow: {
            $subtract: [
              { $dayOfWeek: { date: '$bucketStart', timezone: 'Asia/Seoul' } },
              1,
            ],
          },
          hour: '$hour',
        },
        tripCount: { $sum: '$tripCount' },
        distanceM: { $sum: '$distanceM' },
        durationMin: { $sum: '$durationMin' },
      },
    },
    { $sort: { '_id.stationNumber': 1, '_id.dow': 1, '_id.hour': 1 } },
  ]).allowDiskUse(true);

  const docs: Out[] = rows.map((r) => ({
    stationNumber: r._id.stationNumber,
    dow: r._id.dow,
    hour: r._id.hour,
    ...finalizeMetrics(r),
  }));

  await replaceCollection('agg_station_dow_hour', docs);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\ndone: ${docs.length} rows, sum(tripCount)=${sumTripCount(docs).toLocaleString()} (${elapsed}s)`,
  );
  printSample('agg_station_dow_hour', docs);
  await disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
