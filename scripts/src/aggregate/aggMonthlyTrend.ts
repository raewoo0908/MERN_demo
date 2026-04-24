import { connectLocal, disconnect } from '../lib/db.js';
import { StationMonthly } from '../models/StationMonthly.js';
import { printSample, replaceCollection } from './lib.js';

interface Out {
  district: string;
  yearMonth: string;
  rentCount: number;
  returnCount: number;
  netFlow: number;
  stationCount: number;
}

async function run() {
  await connectLocal();
  console.log('Aggregating agg_monthly_trend from station_monthly…');
  const start = Date.now();

  const rows = await StationMonthly.aggregate<{
    _id: { district: string; yearMonth: string };
    rentCount: number;
    returnCount: number;
    netFlow: number;
    stationCount: number;
  }>([
    {
      $group: {
        _id: { district: '$district', yearMonth: '$yearMonth' },
        rentCount: { $sum: '$rentCount' },
        returnCount: { $sum: '$returnCount' },
        netFlow: { $sum: '$netFlow' },
        stationCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.yearMonth': 1, '_id.district': 1 } },
  ]).allowDiskUse(true);

  const docs: Out[] = rows.map((r) => ({
    district: r._id.district,
    yearMonth: r._id.yearMonth,
    rentCount: r.rentCount,
    returnCount: r.returnCount,
    netFlow: r.netFlow,
    stationCount: r.stationCount,
  }));

  await replaceCollection('agg_monthly_trend', docs);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const totalRent = docs.reduce((s, r) => s + r.rentCount, 0);
  console.log(
    `\ndone: ${docs.length} rows, sum(rentCount)=${totalRent.toLocaleString()} (${elapsed}s)`,
  );
  printSample('agg_monthly_trend', docs);
  await disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
