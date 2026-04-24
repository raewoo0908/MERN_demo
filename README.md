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
- Q4. How do usage patterns differ between subscribers (정기권) and day-pass (일일권) users?
- Q5. What is the distribution of trip duration, and what counts as an outlier?
- Q6. How do usage patterns differ by gender and age group?
- Bonus — monthly demand trend across 6 months (Jul–Dec 2025) at district / station level.

## Data Sources

- **Seoul Open Data Plaza — three CSV datasets (Nov–Dec 2025 trip data + Jul–Dec 2025 monthly)**
  - `tbCycleRentData` — raw trip history with rent/return stations, timestamps, birth year, gender (~1 GB for 2 months, EUC-KR encoded)
  - `tbCycleRentUseTimeInfo` — pre-aggregated hourly buckets by date × hour × station × user type × gender × age group
  - `tbCycleStationUseMonthInfo` — per-station monthly rent/return counts with district (6 months)
- **Seoul Open API (`bikeList`)** — real-time station master: ID, name, latitude/longitude, rack count
- **Korea Meteorological Administration (KMA) API Hub** — ASOS hourly weather for Seoul station (ID 108), fetched via the range endpoint `kma_sfctm3.php`

## Project Structure

```
MERN_DEMO/
├── server/             # Express API (TypeScript, ESM)
├── client/             # React + Vite + Tailwind v4 + Leaflet
├── scripts/            # Data ingestion & aggregation batch jobs (TypeScript)
└── docker-compose.yml  # Local MongoDB (holds ingested + derived collections)
```

## Architecture

Raw trip data (~1 GB over 2 months) is too large for MongoDB Atlas free tier (512 MB), so the pipeline is split:

- **Local MongoDB (Docker)** — holds ingested collections used for exploration and further aggregation:
  - `stations` (~2,700) — master with coordinates, from the Seoul `bikeList` API
  - `hourly_usage` (~4.8 M) — hourly buckets × station × demographic, from `tbCycleRentUseTimeInfo`
  - `station_monthly` (~14 k) — 6-month rent/return counts with district, from `tbCycleStationUseMonthInfo`
  - `weather_hourly` (~1,464) — KMA ASOS hourly for Seoul station 108
- **Raw trip history** (`tbCycleRentData`, ~1 GB) is processed via **streaming aggregation** in Day 3 — parsed line-by-line to build OD matrices and duration distributions, never stored row-by-row.
- **MongoDB Atlas** — only the compact aggregate collections derived in Day 3 (planned: `agg_hourly`, `agg_station_dow_hour`, `agg_dow_hour_usertype`, `agg_demographic_hour`, `agg_station_total`, `agg_od_top`, `agg_duration_hist`) are uploaded for the deployed backend.

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
- [x] Day 2 — Ingestion scripts (stations, hourly_usage, station_monthly, weather) + EUC-KR streaming preprocessing
- [ ] Day 3 — Derived aggregation pipeline + raw trip OD streaming + Atlas upload
- [ ] Day 4 — Express API routes
- [ ] Day 5 — Dashboard layout + KPI / heatmap / top / histogram
- [ ] Day 6 — Map + weather scatter + filters
- [ ] Day 7 — Polish, deploy, README screenshots
