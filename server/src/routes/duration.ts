import { Router } from 'express';
import { AggDurationHist } from '../models/AggDurationHist.js';

// Preserve bucket display order — Mongo sort by string would place 'outlier_*' in the middle.
const BUCKET_ORDER = [
  '0-5',
  '5-10',
  '10-15',
  '15-20',
  '20-30',
  '30-60',
  '60+',
  'outlier_low',
  'outlier_high',
];

export const durationRouter = Router();

durationRouter.get('/', async (_req, res) => {
  const rows = await AggDurationHist.find({}, { _id: 0 }).lean();
  rows.sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket));
  res.json({ count: rows.length, data: rows });
});
