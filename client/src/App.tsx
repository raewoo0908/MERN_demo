import { useEffect, useMemo, useState } from 'react';
import { ApiError, api } from './api/client';
import type {
  DemographicRow,
  DurationRow,
  HourlyRow,
  MonthlyRow,
  StationRow,
  StationTotalRow,
  UsertypeRow,
  WeatherRow,
} from './api/types';
import { DemographicChart } from './components/DemographicChart';
import { DurationHistogram } from './components/DurationHistogram';
import { Heatmap } from './components/Heatmap';
import { KpiRow } from './components/KpiRow';
import { MonthlyTrendChart } from './components/MonthlyTrendChart';
import { Section } from './components/Section';
import { TopStationsChart } from './components/TopStationsChart';
import { UsertypeChart } from './components/UsertypeChart';
import { WeatherScatter } from './components/WeatherScatter';
import { StationMap } from './components/map/StationMap';
import { StationDrillDown } from './components/panels/StationDrillDown';

interface DashboardData {
  hourly: HourlyRow[];
  duration: DurationRow[];
  topStations: StationTotalRow[];
  topStations500: StationTotalRow[];
  stations: StationRow[];
  weather: WeatherRow[];
  monthly: MonthlyRow[];
  usertype: UsertypeRow[];
  demographic: DemographicRow[];
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  useEffect(() => {
    // Fire-and-forget warmup ping: on Render free tier the server spins down after
    // 15 min idle. The /api/health request wakes the dyno in parallel with the
    // main data fetch, shaving ~30s off first-paint on a cold start.
    void api.health().catch(() => {
      /* warmup is best-effort; the real fetch below handles real errors */
    });

    Promise.all([
      api.hourly(),
      api.duration(),
      api.stationsTop(10),
      api.stationsTop(500),
      api.stations(),
      api.weather(),
      api.monthly(),
      api.usertype(),
      api.demographic(),
    ])
      .then(
        ([
          hourly,
          duration,
          top10,
          top500,
          stations,
          weather,
          monthly,
          usertype,
          demographic,
        ]) => {
          setData({
            hourly: hourly.data,
            duration: duration.data,
            topStations: top10.data,
            topStations500: top500.data,
            stations: stations.data,
            weather: weather.data,
            monthly: monthly.data,
            usertype: usertype.data,
            demographic: demographic.data,
          });
        },
      )
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : String(err));
      });
  }, []);

  const selectedStationMaster = useMemo(() => {
    if (!data || !selectedStation) return undefined;
    return data.stations.find((s) => s.stationNumber === selectedStation);
  }, [data, selectedStation]);

  const selectedTopEntry = useMemo(() => {
    if (!data || !selectedStation) return undefined;
    return data.topStations500.find((s) => s.stationNumber === selectedStation);
  }, [data, selectedStation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Ddareungi Analytics</h1>
          <p className="text-sm text-gray-500">
            Seoul public bike usage — Nov 1 ~ Dec 31, 2025
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Failed to load data: {error}
          </div>
        )}

        {!data && !error && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Loading…
          </div>
        )}

        {data && (
          <>
            <KpiRow
              hourly={data.hourly}
              duration={data.duration}
              topStations={data.topStations}
            />

            <Section
              title="Hourly Usage Heatmap"
              subtitle="Trips aggregated by weekday × hour (KST)"
            >
              <Heatmap hourly={data.hourly} />
            </Section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section
                title="Top 10 Stations"
                subtitle="By total trip count over Nov–Dec 2025"
              >
                <TopStationsChart topStations={data.topStations} />
              </Section>

              <Section
                title="Trip Duration Distribution"
                subtitle="Red bars = outliers (<1 min or >600 min)"
              >
                <DurationHistogram duration={data.duration} />
              </Section>
            </div>

            <Section
              title="Station Map & OD Flows"
              subtitle="2,729 stations · click a marker for per-station pattern · OD shows top-50 trips per bucket"
            >
              <StationMap
                stations={data.stations}
                topStations={data.topStations500}
                selectedStation={selectedStation}
                onSelect={setSelectedStation}
              />
            </Section>

            <Section
              title="Weather ↔ Hourly Trips"
              subtitle="Pearson r · hourly join on UTC instant (Nov–Dec 2025)"
            >
              <WeatherScatter hourly={data.hourly} weather={data.weather} />
            </Section>

            <Section
              title="Monthly Rentals by District"
              subtitle="Jul – Nov 2025 (5 months; Dec data unavailable in source CSV)"
            >
              <MonthlyTrendChart monthly={data.monthly} />
            </Section>

            <Section
              title="Subscriber vs Day Pass — Hourly Pattern"
              subtitle="Toggle weekday/weekend to contrast commute peaks against leisure curves"
            >
              <UsertypeChart usertype={data.usertype} />
            </Section>

            <Section
              title="Trips by Gender × Age Group"
              subtitle="Rows with unknown gender or age are excluded"
            >
              <DemographicChart demographic={data.demographic} />
            </Section>
          </>
        )}
      </main>

      {data && selectedStation && (
        <StationDrillDown
          stationNumber={selectedStation}
          stationMaster={selectedStationMaster}
          topEntry={selectedTopEntry}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
}
