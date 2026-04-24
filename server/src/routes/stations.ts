import { Router } from 'express';
import { Station } from '../models/Station.js';
import { AggStationTotal } from '../models/AggStationTotal.js';
import { AggStationDowHour } from '../models/AggStationDowHour.js';
import { HttpError, parseLimit } from '../lib/query.js';

export const stationsRouter = Router();

// All stations — map master
stationsRouter.get('/', async (_req, res) => {
  const rows = await Station.find(
    {},
    {
      _id: 0,
      __v: 0,
      createdAt: 0,
      updatedAt: 0,
      stationInternalId: 0,
    },
  ).lean();
  res.json({ count: rows.length, data: rows });
});

// Top stations by total tripCount — map marker sizing
stationsRouter.get('/top', async (req, res) => {
  const limit = parseLimit(req.query.limit, 50, 500);
  const rows = await AggStationTotal.find({}, { _id: 0 })
    .sort({ tripCount: -1 })
    .limit(limit)
    .lean();
  res.json({ count: rows.length, limit, data: rows });
});

// Per-station dow × hour pattern — Q2 drill-down
stationsRouter.get('/:stationNumber/pattern', async (req, res) => {
  const { stationNumber } = req.params;
  if (!/^\d{1,5}$/.test(stationNumber)) {
    throw new HttpError(400, `invalid stationNumber: ${stationNumber}`);
  }
  const padded = stationNumber.padStart(5, '0');
  const rows = await AggStationDowHour.find({ stationNumber: padded }, { _id: 0 })
    .sort({ dow: 1, hour: 1 })
    .lean();
  if (rows.length === 0) {
    throw new HttpError(404, `no data for stationNumber=${padded}`);
  }
  res.json({ stationNumber: padded, count: rows.length, data: rows });
});
