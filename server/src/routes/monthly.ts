import { Router } from 'express';
import { AggMonthlyTrend } from '../models/AggMonthlyTrend.js';

export const monthlyRouter = Router();

monthlyRouter.get('/', async (req, res) => {
  const district = typeof req.query.district === 'string' ? req.query.district : undefined;
  const filter = district ? { district } : {};
  const rows = await AggMonthlyTrend.find(filter, { _id: 0 })
    .sort({ yearMonth: 1, district: 1 })
    .lean();
  res.json({ count: rows.length, data: rows });
});
