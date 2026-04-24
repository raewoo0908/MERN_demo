# Ddareungi Analytics

Seoul public bike (Ddareungi / 따릉이) usage pattern analytics dashboard — a data engineering + analysis + visualization practice project on the MERN stack (MongoDB, Express, React, Node.js) with TypeScript.

## Goals

1. **Collection & preprocessing** — fetch Seoul public bike trip CSVs and KMA weather data, handle missing/outlier values, build aggregation pipelines.
2. **Statistical analysis** — time-of-day/weekday patterns, station demand ranking, weather ↔ usage correlation, duration distribution.
3. **Visualization** — interactive dashboard with filters, heatmap, Leaflet map, and charts.

## Analytical Questions

- Q1. What are the hourly / weekday usage patterns?
- Q2. Which stations have the highest demand, and where is rent–return imbalance largest?
- Q3. How much do weather conditions (temperature, rainfall, humidity) influence ridership?
- Q4. How do commute-hour patterns differ from leisure-hour patterns?
- Q5. What is the distribution of trip duration, and what counts as an outlier?

## Data Sources

- **Seoul Open Data Plaza** — Ddareungi trip history (monthly CSV) and station master data.
- **Korea Meteorological Administration (KMA)** — ASOS hourly weather for Seoul station (ID 108).

## Project Structure

```
MERN_DEMO/
├── server/             # Express API (TypeScript, ESM)
├── client/             # React + Vite + Tailwind v4 + Leaflet
├── scripts/            # Data ingestion & aggregation batch jobs (TypeScript)
└── docker-compose.yml  # Local MongoDB for raw trip data
```

## Architecture

Raw trip data (millions of rows over 2 months) is too large for MongoDB Atlas free tier (512MB), so:

- **Local MongoDB (Docker)** — raw `trips` ingestion + preprocessing + aggregation.
- **MongoDB Atlas** — only the compact aggregated collections (`stations`, `weather_hourly`, `agg_hourly`, `agg_station_hour`) are uploaded for the deployed backend.

This keeps the dashboard fast and free-tier-friendly while still exercising the full ingestion → preprocessing → analysis → serving pipeline.

## Setup

### 1. Prerequisites

- Node.js 22+
- Docker Desktop
- API keys
  - [Seoul Open Data Plaza](http://data.seoul.go.kr)
  - [KMA API Hub](https://apihub.kma.go.kr)
- MongoDB Atlas free cluster (for deployment)

### 2. Environment files

Copy each `.env.example` to `.env` in the same directory and fill in values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp scripts/.env.example scripts/.env
```

### 3. Start local MongoDB

```bash
docker compose up -d
```

### 4. Install dependencies

```bash
(cd server  && npm install)
(cd client  && npm install)
(cd scripts && npm install)
```

### 5. Run dev servers

```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — Client
cd client && npm run dev
```

Open http://localhost:5173.

## Deployment

- **Frontend** — Vercel
- **Backend** — Render
- **Database** — MongoDB Atlas (aggregated collections only)

## Roadmap

- [x] Day 1 — Planning, scaffold, env, Docker
- [ ] Day 2 — Ingestion scripts (trips, stations, weather) + preprocessing
- [ ] Day 3 — Aggregation pipeline + Atlas upload
- [ ] Day 4 — Express API routes
- [ ] Day 5 — Dashboard layout + KPI / heatmap / top / histogram
- [ ] Day 6 — Map + weather scatter + filters
- [ ] Day 7 — Polish, deploy, README screenshots
