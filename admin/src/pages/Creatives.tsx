import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCreatives, deleteCreative } from '../api';

type CreativesSortKey = 'name' | 'campaign_name' | 'type' | 'width' | 'height';

export default function Creatives() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<CreativesSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = () => {
    setLoading(true);
    getCreatives()
      .then(setCreatives)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить креатив "${name}"?`)) return;
    await deleteCreative(id);
    load();
  };

  const sortedCreatives = useMemo(() => {
    return [...creatives].sort((a, b) => {
      const va = a[sortBy] ?? '';
      const vb = b[sortBy] ?? '';
      const cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [creatives, sortBy, sortDir]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Креативы</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Сортировка:</span>
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split('-') as [CreativesSortKey, 'asc' | 'desc'];
              setSortBy(k);
              setSortDir(d);
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="name-asc">По названию (А→Я)</option>
            <option value="name-desc">По названию (Я→А)</option>
            <option value="campaign_name-asc">По кампании (А→Я)</option>
            <option value="campaign_name-desc">По кампании (Я→А)</option>
            <option value="type-asc">По типу</option>
            <option value="width-desc">По ширине (↓)</option>
            <option value="width-asc">По ширине (↑)</option>
          </select>
          <Link
            to="/creatives/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Новый креатив
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <div className="spinner" aria-hidden />
          <span>Загрузка...</span>
        </div>
      ) : creatives.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <p className="text-gray-500 mb-4">Нет креативов. Добавьте первый баннер.</p>
          <Link
            to="/creatives/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Новый креатив
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCreatives.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {c.image_url && (
                <div className="bg-gray-100 flex items-center justify-center p-4 h-48">
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{c.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.campaign_name} &middot; {c.width}x{c.height} &middot; {c.type}
                      {c.effective_weight != null && (
                        <span className="ml-1 text-teal-600" title="A/B вес по CTR"> &middot; A/B: {c.effective_weight}</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {c.status === 'active' ? 'Активен' : 'Пауза'}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 text-xs">
                  <Link to={`/creatives/${c.id}/edit`} className="text-indigo-600 hover:underline">
                    Изменить
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-red-500 hover:underline"
                    aria-label={`Удалить креатив ${c.name}`}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
