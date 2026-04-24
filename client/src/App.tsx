import { useEffect, useState } from 'react';
import { ApiError, api } from './api/client';
import type {
  DurationRow,
  HourlyRow,
  StationTotalRow,
} from './api/types';
import { DurationHistogram } from './components/DurationHistogram';
import { Heatmap } from './components/Heatmap';
import { KpiRow } from './components/KpiRow';
import { Section } from './components/Section';
import { TopStationsChart } from './components/TopStationsChart';

interface DashboardData {
  hourly: HourlyRow[];
  duration: DurationRow[];
  topStations: StationTotalRow[];
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.hourly(), api.duration(), api.stationsTop(10)])
      .then(([hourly, duration, topStations]) => {
        setData({
          hourly: hourly.data,
          duration: duration.data,
          topStations: topStations.data,
        });
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : String(err));
      });
  }, []);

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
          </>
        )}
      </main>
    </div>
  );
}
