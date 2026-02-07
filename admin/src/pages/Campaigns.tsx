import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns, deleteCampaign } from '../api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getCampaigns()
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить кампанию "${name}"?`)) return;
    await deleteCampaign(id);
    load();
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || 'bg-gray-100'}`}>
        {s}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Кампании</h1>
        <Link
          to="/campaigns/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Новая кампания
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет кампаний. Создайте первую!</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Название</th>
                <th className="px-5 py-3">Статус</th>
                <th className="px-5 py-3">Креативы</th>
                <th className="px-5 py-3">Показы</th>
                <th className="px-5 py-3">Клики</th>
                <th className="px-5 py-3">CTR</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((c) => {
                const ctr = c.total_impressions > 0 ? ((c.total_clicks / c.total_impressions) * 100).toFixed(2) : '—';
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-400">#{c.id}</td>
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3">{statusBadge(c.status)}</td>
                    <td className="px-5 py-3">{c.creatives_count}</td>
                    <td className="px-5 py-3">{Number(c.total_impressions).toLocaleString()}</td>
                    <td className="px-5 py-3">{Number(c.total_clicks).toLocaleString()}</td>
                    <td className="px-5 py-3">{ctr}%</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <Link to={`/campaigns/${c.id}/edit`} className="text-indigo-600 hover:underline">
                        Изменить
                      </Link>
                      <button onClick={() => handleDelete(c.id, c.name)} className="text-red-500 hover:underline">
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
