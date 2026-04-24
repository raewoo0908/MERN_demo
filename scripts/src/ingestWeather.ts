import { connectLocal, disconnect } from './lib/db.js';
import { getEnv } from './lib/env.js';
import { fetchText, sleep } from './lib/http.js';
import { toKmaNumber } from './lib/clean.js';
import {
  parseKstDate,
  formatKmaTm,
  chunkHourRange,
} from './lib/time.js';
import {
  WeatherHourly,
  type WeatherHourlyDoc,
} from './models/WeatherHourly.js';

const STN = 108; // Seoul
const CHUNK_DAYS = 7;
const DELAY_MS = 300;

// Token positions per KMA ASOS spec (0-indexed).
// TM=0, STN=1, WS=3, TA=11, HM=13, RN=15, RN_DAY=16, CA_TOT=25
function parseAsos(body: string): WeatherHourlyDoc[] {
  const out: WeatherHourlyDoc[] = [];
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length < 17) continue;
    const tm = tokens[0];
    const stn = Number(tokens[1]);
    if (stn !== STN) continue;
    if (!/^\d{12}$/.test(tm)) continue;

    const yy = tm.slice(0, 4);
    const mo = tm.slice(4, 6);
    const dd = tm.slice(6, 8);
    const hh = Number(tm.slice(8, 10));
    const hour = parseKstDate(`${yy}-${mo}-${dd}`, hh);

    out.push({
      hour,
      stationId: stn,
      windMs: toKmaNumber(tokens[3]),
      tempC: toKmaNumber(tokens[11]),
      humidityPct: toKmaNumber(tokens[13]),
      rainfall3hMm: toKmaNumber(tokens[15]),
      rainfallDayMm: toKmaNumber(tokens[16]),
      cloudCoverTenths: tokens.length > 25 ? toKmaNumber(tokens[25]) : null,
    });
  }
  return out;
}

async function main() {
  const authKey = getEnv('KMA_API_KEY');
  const startStr = getEnv('ANALYSIS_START_DATE');
  const endStr = getEnv('ANALYSIS_END_DATE');

  await connectLocal();
  await WeatherHourly.deleteMany({ stationId: STN });
  console.log(`Cleared weather_hourly for STN=${STN}`);

  const startDate = parseKstDate(startStr, 0);
  const endDate = parseKstDate(endStr, 23);
  const chunks = chunkHourRange(startDate, endDate, CHUNK_DAYS);
  console.log(
    `Fetching KMA ASOS STN=${STN} in ${chunks.length} chunks of ≤${CHUNK_DAYS} days (${startStr} → ${endStr})`,
  );

  let totalInserted = 0;
  let failed = 0;

  for (const [chunkStart, chunkEnd] of chunks) {
    const tm1 = formatKmaTm(chunkStart);
    const tm2 = formatKmaTm(chunkEnd);
    const url = `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm3.php?tm1=${tm1}&tm2=${tm2}&stn=${STN}&help=0&authKey=${authKey}`;

    try {
      const body = await fetchText(url, { timeoutMs: 60_000, retries: 2 });
      const docs = parseAsos(body);
      if (docs.length > 0) {
        await WeatherHourly.insertMany(docs, { ordered: false });
      }
      totalInserted += docs.length;
      console.log(`  ${tm1}–${tm2}: +${docs.length} rows (total ${totalInserted})`);
    } catch (err) {
      failed++;
      console.warn(`  failed ${tm1}–${tm2}: ${(err as Error).message}`);
    }
    await sleep(DELAY_MS);
  }

  await WeatherHourly.createIndexes();
  const total = await WeatherHourly.countDocuments({ stationId: STN });
  console.log(
    `\nDone. ${total} weather rows in DB for STN=${STN} (${failed} failed chunks)`,
  );

  await disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
