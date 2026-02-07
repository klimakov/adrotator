import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlacements, deletePlacement } from '../api';

export default function Placements() {
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : placements.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет площадок.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Название</th>
                <th className="px-5 py-3">Домен</th>
                <th className="px-5 py-3">Zone Key</th>
                <th className="px-5 py-3">Размер</th>
                <th className="px-5 py-3">Креативы</th>
                <th className="px-5 py-3">Показы</th>
                <th className="px-5 py-3">Клики</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {placements.map((p) => (
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
                  <td className="px-5 py-3">{Number(p.total_clicks).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <Link to={`/placements/${p.id}/edit`} className="text-indigo-600 hover:underline">
                      Изменить
                    </Link>
                    <button onClick={() => handleDelete(p.id, p.name)} className="text-red-500 hover:underline">
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
