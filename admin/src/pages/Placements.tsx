import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlacements, deletePlacement } from '../api';

type SortKey = 'id' | 'name' | 'site_domain' | 'zone_key' | 'creatives_count' | 'total_impressions' | 'total_viewable' | 'total_clicks' | 'viewability';
type SortDir = 'asc' | 'desc';

function PlacementsTh({
  colKey, sortBy, sortDir, onSort, onDir, children,
}: {
  colKey: SortKey; sortBy: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void; onDir: (d: SortDir) => void; children: React.ReactNode;
}) {
  const toggle = () => {
    if (sortBy === colKey) onDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { onSort(colKey); onDir('asc'); }
  };
  return (
    <th className="px-5 py-3">
      <button type="button" onClick={toggle} className="text-left text-xs text-gray-500 uppercase tracking-wider hover:text-gray-700 flex items-center gap-1">
        {children}
        {sortBy === colKey && (sortDir === 'asc' ? ' ↑' : ' ↓')}
      </button>
    </th>
  );
}

export default function Placements() {
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const load = () => {
    setLoading(true);
    getPlacements()
      .then(setPlacements)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить площадку "${name}"?`)) return;
    await deletePlacement(id);
    load();
  };

  const sortedPlacements = useMemo(() => {
    const list = placements.map((p) => ({
      ...p,
      _viewability: Number(p.total_impressions) > 0 && Number(p.total_viewable ?? 0) > 0
        ? (Number(p.total_viewable) / Number(p.total_impressions)) * 100
        : 0,
    }));
    return [...list].sort((a, b) => {
      let va: number | string = a[sortBy];
      let vb: number | string = b[sortBy];
      if (sortBy === 'viewability') { va = a._viewability; vb = b._viewability; }
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      const sa = String(va ?? '').toLowerCase();
      const sb = String(vb ?? '').toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [placements, sortBy, sortDir]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Площадки</h1>
        <Link
          to="/placements/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Новая площадка
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <div className="spinner" aria-hidden />
          <span>Загрузка...</span>
        </div>
      ) : placements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <p className="text-gray-500 mb-4">Нет площадок. Создайте рекламную зону.</p>
          <Link
            to="/placements/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Новая площадка
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="id">ID</PlacementsTh>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="name">Название</PlacementsTh>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="site_domain">Домен</PlacementsTh>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="zone_key">Zone Key</PlacementsTh>
                <th className="px-5 py-3">Размер</th>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="creatives_count">Креативы</PlacementsTh>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="total_impressions">Показы</PlacementsTh>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="total_viewable">Видимые</PlacementsTh>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="viewability">Viewability</PlacementsTh>
                <PlacementsTh sortBy={sortBy} sortDir={sortDir} onSort={setSortBy} onDir={setSortDir} colKey="total_clicks">Клики</PlacementsTh>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedPlacements.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">#{p.id}</td>
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-gray-500">{p.site_domain || '—'}</td>
                  <td className="px-5 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{p.zone_key}</code>
                  </td>
                  <td className="px-5 py-3">
                    {p.width}x{p.height}
                  </td>
                  <td className="px-5 py-3">{p.creatives_count}</td>
                  <td className="px-5 py-3">{Number(p.total_impressions).toLocaleString()}</td>
                  <td className="px-5 py-3">{Number(p.total_viewable ?? 0).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {Number(p.total_impressions) > 0 && Number(p.total_viewable ?? 0) > 0
                      ? ((Number(p.total_viewable) / Number(p.total_impressions)) * 100).toFixed(1) + '%'
                      : '—'}
                  </td>
                  <td className="px-5 py-3">{Number(p.total_clicks).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <Link to={`/placements/${p.id}/edit`} className="text-indigo-600 hover:underline">
                      Изменить
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-red-500 hover:underline"
                      aria-label={`Удалить площадку ${p.name}`}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
