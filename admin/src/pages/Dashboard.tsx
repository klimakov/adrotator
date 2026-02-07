import { useEffect, useState } from 'react';
import { getStatsSummary, getDailyStats } from '../api';

interface Summary {
  active_campaigns: number;
  active_creatives: number;
  active_placements: number;
  today_impressions: number;
  today_clicks: number;
  total_impressions: number;
  total_clicks: number;
}

interface DayStat {
  date: string;
  impressions: number;
  clicks: number;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStatsSummary(), getDailyStats(14)])
      .then(([s, d]) => {
        setSummary(s);
        setDaily(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
        <div className="spinner" aria-hidden />
        <span>Загрузка...</span>
      </div>
    );
  }

  const cards = summary
    ? [
        { label: 'Активных кампаний', value: summary.active_campaigns, color: 'bg-indigo-500' },
        { label: 'Активных креативов', value: summary.active_creatives, color: 'bg-emerald-500' },
        { label: 'Активных площадок', value: summary.active_placements, color: 'bg-amber-500' },
        { label: 'Показов сегодня', value: summary.today_impressions.toLocaleString(), color: 'bg-sky-500' },
        { label: 'Кликов сегодня', value: summary.today_clicks.toLocaleString(), color: 'bg-pink-500' },
        {
          label: 'CTR сегодня',
          value:
            summary.today_impressions > 0
              ? ((summary.today_clicks / summary.today_impressions) * 100).toFixed(2) + '%'
              : '—',
          color: 'bg-violet-500',
        },
      ]
    : [];

  const maxImp = Math.max(1, ...daily.map((d) => d.impressions));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Дашборд</h1>

      {/* Карточки */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => {
          const accent =
            c.color === 'bg-indigo-500'
              ? 'rgb(99 102 241)'
              : c.color === 'bg-emerald-500'
                ? 'rgb(16 185 129)'
                : c.color === 'bg-amber-500'
                  ? 'rgb(245 158 11)'
                  : c.color === 'bg-sky-500'
                    ? 'rgb(14 165 233)'
                    : c.color === 'bg-pink-500'
                      ? 'rgb(236 72 153)'
                      : 'rgb(139 92 246)';
          return (
            <div
              key={c.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 border-l-4"
              style={{ borderLeftColor: accent }}
            >
              <span className="text-sm text-gray-500">{c.label}</span>
              <div className="text-3xl font-bold mt-2">{c.value}</div>
            </div>
          );
        })}
      </div>

      {/* Всего */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-8">
          <h2 className="text-lg font-semibold mb-3">Всего за всё время</h2>
          <div className="flex gap-8 text-sm">
            <div>
              <span className="text-gray-500">Показы: </span>
              <span className="font-semibold">{summary.total_impressions.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Клики: </span>
              <span className="font-semibold">{summary.total_clicks.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">CTR: </span>
              <span className="font-semibold">
                {summary.total_impressions > 0
                  ? ((summary.total_clicks / summary.total_impressions) * 100).toFixed(2) + '%'
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Простой бар-чарт за 14 дней */}
      {daily.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-lg font-semibold mb-4">Показы за 14 дней</h2>
          <div className="flex items-end gap-1 h-40">
            {daily.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-indigo-500 rounded-t transition-all"
                  style={{ height: `${(d.impressions / maxImp) * 100}%`, minHeight: d.impressions > 0 ? 4 : 0 }}
                  title={`${d.date}: ${d.impressions} показов, ${d.clicks} кликов`}
                />
                <span className="text-[10px] text-gray-400 rotate-[-45deg] origin-top-left whitespace-nowrap">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
