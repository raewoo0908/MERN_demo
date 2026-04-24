/**
 * Parse an inclusive KST date range from query params into a UTC-instant filter.
 *
 * Input strings are `YYYY-MM-DD` wall-clock KST. Because stored dates in Mongo
 * are KST wall-clock → UTC instants, we must convert the query bounds the same
 * way before comparing.
 */
export function parseDateRange(
  from: unknown,
  to: unknown,
): { $gte?: Date; $lte?: Date } | null {
  const filter: { $gte?: Date; $lte?: Date } = {};

  if (typeof from === 'string' && from) {
    const m = from.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new HttpError(400, `invalid 'from' date: ${from}`);
    filter.$gte = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], -9));
  }
  if (typeof to === 'string' && to) {
    const m = to.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new HttpError(400, `invalid 'to' date: ${to}`);
    // 'to' is inclusive end-of-day KST → next-day 00:00 KST - 1s.
    filter.$lte = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 1, -9) - 1000);
  }

  return Object.keys(filter).length > 0 ? filter : null;
}

export function parseLimit(raw: unknown, fallback: number, max = 1000): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpError(400, `invalid 'limit': ${raw}`);
  }
  return Math.min(Math.floor(n), max);
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
