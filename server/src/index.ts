import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import mongoose from 'mongoose';
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

// CLIENT_URL accepts a comma-separated list of exact origins. In addition, we allow any
// *.vercel.app subdomain so that per-PR preview deployments don't need manual config.
const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    // Same-origin / curl / server-to-server requests have no Origin header
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || VERCEL_PREVIEW.test(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`));
  },
};

app.use(cors(corsOptions));
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
  const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });

  // Render sends SIGTERM when shutting down; close accepting new connections first,
  // then drain pending requests (10s grace), then close mongoose.
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down`);
    server.close(() => console.log('HTTP server closed'));
    setTimeout(() => {
      console.error('Forced shutdown after 10s grace');
      process.exit(1);
    }, 10_000).unref();
    try {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
