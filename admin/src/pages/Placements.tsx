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
