import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns, deleteCampaign } from '../api';

type SortKey = 'id' | 'name' | 'status' | 'creatives_count' | 'total_impressions' | 'total_viewable' | 'total_clicks' | 'ctr' | 'viewability';
type SortDir = 'asc' | 'desc';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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

  const statusLabel: Record<string, string> = {
    active: 'Активна',
    paused: 'Пауза',
    archived: 'Архив',
  };
  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || 'bg-gray-100'}`}>
        {statusLabel[s] ?? s}
      </span>
    );
  };

  const sortedCampaigns = useMemo(() => {
    const list = campaigns.map((c) => ({
      ...c,
      _viewability: Number(c.total_impressions) > 0 && Number(c.total_viewable ?? 0) > 0
        ? (Number(c.total_viewable) / Number(c.total_impressions)) * 100
        : 0,
      _ctr: Number(c.total_impressions) > 0 ? (c.total_clicks / Number(c.total_impressions)) * 100 : 0,
    }));
    return [...list].sort((a, b) => {
      let va: number | string = a[sortBy];
      let vb: number | string = b[sortBy];
      if (sortBy === 'viewability') { va = a._viewability; vb = b._viewability; }
      if (sortBy === 'ctr') { va = a._ctr; vb = b._ctr; }
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      const sa = String(va ?? '').toLowerCase();
      const sb = String(vb ?? '').toLowerCase();
      const cmp = sa.localeCompare(sb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [campaigns, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  const Th = ({ colKey, children }: { colKey: SortKey; children: React.ReactNode }) => (
    <th className="px-5 py-3">
      <button
        type="button"
        onClick={() => toggleSort(colKey)}
        className="text-left text-xs text-gray-500 uppercase tracking-wider hover:text-gray-700 flex items-center gap-1"
      >
        {children}
        {sortBy === colKey && (sortDir === 'asc' ? ' ↑' : ' ↓')}
      </button>
    </th>
  );

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
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <div className="spinner" aria-hidden />
          <span>Загрузка...</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <p className="text-gray-500 mb-4">Нет кампаний. Создайте первую!</p>
          <Link
            to="/campaigns/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Создать кампанию
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <Th colKey="id">ID</Th>
                <Th colKey="name">Название</Th>
                <Th colKey="status">Статус</Th>
                <Th colKey="creatives_count">Креативы</Th>
                <Th colKey="total_impressions">Показы</Th>
                <Th colKey="total_viewable">Видимые</Th>
                <Th colKey="viewability">Viewability</Th>
                <Th colKey="total_clicks">Клики</Th>
                <Th colKey="ctr">CTR</Th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedCampaigns.map((c) => {
                const imp = Number(c.total_impressions);
                const viewable = Number(c.total_viewable ?? 0);
                const ctr = imp > 0 ? ((c.total_clicks / imp) * 100).toFixed(2) : '—';
                const viewability = imp > 0 && viewable > 0 ? ((viewable / imp) * 100).toFixed(1) + '%' : '—';
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-400">#{c.id}</td>
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3">{statusBadge(c.status)}</td>
                    <td className="px-5 py-3">{c.creatives_count}</td>
                    <td className="px-5 py-3">{imp.toLocaleString()}</td>
                    <td className="px-5 py-3">{viewable.toLocaleString()}</td>
                    <td className="px-5 py-3">{viewability}</td>
                    <td className="px-5 py-3">{Number(c.total_clicks).toLocaleString()}</td>
                    <td className="px-5 py-3">{ctr}%</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <Link to={`/campaigns/${c.id}/edit`} className="text-indigo-600 hover:underline">
                        Изменить
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.name)}
                        className="text-red-500 hover:underline"
                        aria-label={`Удалить кампанию ${c.name}`}
                      >
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
