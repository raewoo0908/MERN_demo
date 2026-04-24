import { Router } from 'express';
import { AggDemographicHour } from '../models/AggDemographicHour.js';
import { AggAgeDistribution } from '../models/AggAgeDistribution.js';

export const demographicRouter = Router();

demographicRouter.get('/', async (_req, res) => {
  const rows = await AggDemographicHour.find({}, { _id: 0 })
    .sort({ dow: 1, hour: 1, gender: 1, ageGroup: 1 })
    .lean();
  res.json({ count: rows.length, data: rows });
});

export const ageRouter = Router();

ageRouter.get('/', async (_req, res) => {
  const rows = await AggAgeDistribution.find({}, { _id: 0 })
    .sort({ dow: 1, hour: 1, ageBucket: 1 })
    .lean();
  res.json({ count: rows.length, data: rows });
});
