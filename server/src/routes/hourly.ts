import { Router } from 'express';
import { AggHourly } from '../models/AggHourly.js';
import { parseDateRange } from '../lib/query.js';

export const hourlyRouter = Router();

hourlyRouter.get('/', async (req, res) => {
  const range = parseDateRange(req.query.from, req.query.to);
  const filter = range ? { bucketStart: range } : {};
  const rows = await AggHourly.find(filter, { _id: 0 }).sort({ bucketStart: 1 }).lean();
  res.json({ count: rows.length, data: rows });
});
