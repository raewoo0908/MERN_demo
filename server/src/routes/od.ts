import { Router } from 'express';
import { AggOdTop, type OdBucket } from '../models/AggOdTop.js';
import { HttpError, parseLimit } from '../lib/query.js';

const VALID_BUCKETS: OdBucket[] = ['AM_commute', 'PM_commute', 'weekend'];

export const odRouter = Router();

odRouter.get('/', async (req, res) => {
  const bucketRaw = req.query.bucket;
  if (typeof bucketRaw !== 'string' || !VALID_BUCKETS.includes(bucketRaw as OdBucket)) {
    throw new HttpError(
      400,
      `query param 'bucket' is required, one of: ${VALID_BUCKETS.join(', ')}`,
    );
  }
  const bucket = bucketRaw as OdBucket;
  const limit = parseLimit(req.query.limit, 100, 300);

  const rows = await AggOdTop.find({ bucket }, { _id: 0 })
    .sort({ rank: 1 })
    .limit(limit)
    .lean();

  res.json({ bucket, count: rows.length, limit, data: rows });
});
