import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCreatives, deleteCreative } from '../api';

export default function Creatives() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Креативы</h1>
        <Link
          to="/creatives/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Новый креатив
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : creatives.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет креативов.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map((c) => (
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
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 text-xs">
                  <Link to={`/creatives/${c.id}/edit`} className="text-indigo-600 hover:underline">
                    Изменить
                  </Link>
                  <button onClick={() => handleDelete(c.id, c.name)} className="text-red-500 hover:underline">
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
