import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { UsertypeRow } from '../api/types';
import { formatInt } from '../lib/format';

type DowScope = 'all' | 'weekday' | 'weekend';

interface Props {
  usertype: UsertypeRow[];
}

// Roll up 8 raw userType values into 2 canonical buckets.
// Family/other (가족권·기타) are dropped since they're < 1% of trips and distract from the
// main subscriber-vs-pass contrast.
function rollUp(userType: string): 'Subscriber' | 'Day Pass' | null {
  if (userType.startsWith('정기권')) return 'Subscriber';
  if (userType.startsWith('일일권')) return 'Day Pass';
  return null;
}

function inScope(dow: number, scope: DowScope): boolean {
  if (scope === 'all') return true;
  // dow is 0..6 where 0 = Sunday (per aggDowHourUsertype's ($dayOfWeek - 1))
  const isWeekend = dow === 0 || dow === 6;
  return scope === 'weekend' ? isWeekend : !isWeekend;
}

const SCOPE_LABEL: Record<DowScope, string> = {
  all: 'All days',
  weekday: 'Weekdays (Mon–Fri)',
  weekend: 'Weekends (Sat–Sun)',
};

export function UsertypeChart({ usertype }: Props) {
  const [scope, setScope] = useState<DowScope>('all');

  const { data, subscriberTotal, passTotal } = useMemo(() => {
    const perHour: { sub: number; pass: number }[] = Array.from(
      { length: 24 },
      () => ({ sub: 0, pass: 0 }),
    );
    let sub = 0;
    let pass = 0;
    for (const r of usertype) {
      if (!inScope(r.dow, scope)) continue;
      const bucket = rollUp(r.userType);
      if (!bucket) continue;
      if (bucket === 'Subscriber') {
        perHour[r.hour].sub += r.tripCount;
        sub += r.tripCount;
      } else {
        perHour[r.hour].pass += r.tripCount;
        pass += r.tripCount;
      }
    }
    const d = perHour.map((v, h) => ({
      hour: h,
      Subscriber: v.sub,
      'Day Pass': v.pass,
    }));
    return { data: d, subscriberTotal: sub, passTotal: pass };
  }, [usertype, scope]);

  const total = subscriberTotal + passTotal;
  const subPct = total > 0 ? ((subscriberTotal / total) * 100).toFixed(1) : '0';
  const passPct = total > 0 ? ((passTotal / total) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-gray-300 bg-white text-xs">
          {(['all', 'weekday', 'weekend'] as DowScope[]).map((s, i, arr) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-3 py-1 transition ${
                scope === s
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${i === 0 ? 'rounded-l-md' : ''} ${
                i === arr.length - 1 ? 'rounded-r-md' : ''
              }`}
            >
              {SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-medium text-blue-700">Subscriber {subPct}%</span>
          <span className="mx-1">·</span>
          <span className="font-medium text-amber-700">Day Pass {passPct}%</span>
          <span className="ml-2 text-gray-400">
            (n={formatInt(total)})
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: '#374151' }}
            label={{
              value: 'Hour (KST)',
              position: 'insideBottom',
              offset: -4,
              style: { fontSize: 11, fill: '#6b7280' },
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            formatter={(v: number, name: string) => [formatInt(v), name]}
            labelFormatter={(h: number) => `${h}:00`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="Subscriber"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Day Pass"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-2 text-[11px] text-gray-500">
        Family pass and other minor userTypes excluded (&lt; 1% of trips).
      </p>
    </div>
  );
}
