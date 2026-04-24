import { Router } from 'express';
import { WeatherHourly } from '../models/WeatherHourly.js';
import { parseDateRange } from '../lib/query.js';

export const weatherRouter = Router();

weatherRouter.get('/', async (req, res) => {
  const range = parseDateRange(req.query.from, req.query.to);
  const filter = range ? { hour: range } : {};
  const rows = await WeatherHourly.find(filter, { _id: 0, __v: 0 })
    .sort({ hour: 1 })
    .lean();
  res.json({ count: rows.length, data: rows });
});
