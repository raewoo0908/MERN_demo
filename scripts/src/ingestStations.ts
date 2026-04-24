import { connectLocal, disconnect } from './lib/db.js';
import { getEnv } from './lib/env.js';
import { fetchText } from './lib/http.js';
import {
  toNumber,
  extractStationNumberFromName,
  cleanStationName,
} from './lib/clean.js';
import { Station, type StationDoc } from './models/Station.js';

interface BikeListRow {
  stationName: string;
  stationId: string;
  stationLatitude: string;
  stationLongitude: string;
  rackTotCnt: string;
}

interface BikeListResponse {
  rentBikeStatus?: {
    list_total_count?: number | string;
    row?: BikeListRow[];
    RESULT?: { CODE: string; MESSAGE: string };
  };
}

async function fetchPage(
  key: string,
  start: number,
  end: number,
): Promise<BikeListRow[]> {
  const url = `http://openapi.seoul.go.kr:8088/${key}/json/bikeList/${start}/${end}/`;
  const body = await fetchText(url);
  const json = JSON.parse(body) as BikeListResponse;
  const rows = json.rentBikeStatus?.row ?? [];
  const result = json.rentBikeStatus?.RESULT;
  if (rows.length === 0 && result && result.CODE !== 'INFO-000') {
    throw new Error(`Seoul API error: ${result.CODE} ${result.MESSAGE}`);
  }
  return rows;
}

async function main() {
  const key = getEnv('SEOUL_OPEN_API_KEY');
  await connectLocal();

  const all: BikeListRow[] = [];
  const PAGE = 1000;
  for (let start = 1; start <= 5000; start += PAGE) {
    const end = start + PAGE - 1;
    const page = await fetchPage(key, start, end);
    console.log(`  fetched ${page.length} stations (${start}-${end})`);
    all.push(...page);
    if (page.length < PAGE) break;
  }
  console.log(`Total stations from API: ${all.length}`);

  const docs: StationDoc[] = [];
  for (const r of all) {
    const num = extractStationNumberFromName(r.stationName);
    const lat = toNumber(r.stationLatitude);
    const lng = toNumber(r.stationLongitude);
    const rack = toNumber(r.rackTotCnt);
    if (!num || lat === null || lng === null || rack === null) continue;
    docs.push({
      stationNumber: num,
      stationInternalId: r.stationId,
      name: cleanStationName(r.stationName) ?? r.stationName,
      nameFull: r.stationName,
      lat,
      lng,
      rackCount: rack,
    });
  }
  console.log(`Valid docs: ${docs.length}`);

  const ops = docs.map((d) => ({
    updateOne: {
      filter: { stationNumber: d.stationNumber },
      update: { $set: d },
      upsert: true,
    },
  }));
  const result = await Station.bulkWrite(ops, { ordered: false });
  console.log(
    `Upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`,
  );

  await Station.createIndexes();
  await disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
