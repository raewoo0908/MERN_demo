import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { connectDb } from './db.js';
import { HttpError } from './lib/query.js';
import { hourlyRouter } from './routes/hourly.js';
import { stationsRouter } from './routes/stations.js';
import { weatherRouter } from './routes/weather.js';
import { usertypeRouter } from './routes/usertype.js';
import { ageRouter, demographicRouter } from './routes/demographic.js';
import { monthlyRouter } from './routes/monthly.js';
import { odRouter } from './routes/od.js';
import { durationRouter } from './routes/duration.js';

const app = express();
const port = Number(process.env.PORT) || 4000;
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/hourly', hourlyRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/usertype', usertypeRouter);
app.use('/api/demographic', demographicRouter);
app.use('/api/age', ageRouter);
app.use('/api/monthly', monthlyRouter);
app.use('/api/od', odRouter);
app.use('/api/duration', durationRouter);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next(new HttpError(404, `route not found: ${req.method} ${req.path}`));
    return;
  }
  next();
});

app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    const status = err instanceof HttpError ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message, status });
  },
);

async function main() {
  await connectDb();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
