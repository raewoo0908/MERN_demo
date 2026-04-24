import { Router } from 'express';
import { AggDowHourUsertype } from '../models/AggDowHourUsertype.js';

export const usertypeRouter = Router();

usertypeRouter.get('/', async (_req, res) => {
  const rows = await AggDowHourUsertype.find({}, { _id: 0 })
    .sort({ dow: 1, hour: 1, userType: 1 })
    .lean();
  res.json({ count: rows.length, data: rows });
});
