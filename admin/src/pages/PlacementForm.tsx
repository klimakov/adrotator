import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlacement, createPlacement, updatePlacement, getCreatives, setPlacementCreatives } from '../api';

export default function PlacementForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '',
    site_domain: '',
    zone_key: '',
    width: 300,
    height: 250,
    status: 'active',
  });
  const [allCreatives, setAllCreatives] = useState<any[]>([]);
  const [selectedCreatives, setSelectedCreatives] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [snippet, setSnippet] = useState('');

  useEffect(() => {
    getCreatives().then(setAllCreatives);
    if (isEdit) {
      getPlacement(Number(id)).then((p) => {
        setForm({
          name: p.name,
          site_domain: p.site_domain || '',
          zone_key: p.zone_key,
          width: p.width,
          height: p.height,
          status: p.status,
        });
        setSelectedCreatives((p.creatives || []).map((c: any) => c.id));
        updateSnippet(p.zone_key);
      });
    }
  }, [id]);

  const updateSnippet = (zoneKey: string) => {
    const server = window.location.origin;
    setSnippet(
      `<!-- AdRotator: вставьте этот код на свой сайт -->\n<div data-ad-zone="${zoneKey}"></div>\n<script src="${server}/sdk/ad.js" data-server="${server}"></script>`
    );
  };

  const toggleCreative = (cid: number) => {
    setSelectedCreatives((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let placementId: number;
      if (isEdit) {
        const updated = await updatePlacement(Number(id), form);
        placementId = updated.id;
      } else {
        const created = await createPlacement(form);
        placementId = created.id;
      }
      await setPlacementCreatives(placementId, selectedCreatives);
      navigate('/placements');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'zone_key') updateSnippet(value);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Редактировать площадку' : 'Новая площадка'}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Домен сайта</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="example.com"
              value={form.site_domain}
              onChange={(e) => set('site_domain', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone Key (уникальный идентификатор)</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="sidebar-300x250"
              value={form.zone_key}
              onChange={(e) => set('zone_key', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ширина (px)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.width}
                onChange={(e) => set('width', parseInt(e.target.value) || 300)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Высота (px)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.height}
                onChange={(e) => set('height', parseInt(e.target.value) || 250)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="active">Активна</option>
              <option value="paused">Пауза</option>
            </select>
          </div>

          {/* Привязка креативов */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Креативы в ротации</label>
            {allCreatives.length === 0 ? (
              <p className="text-xs text-gray-400">Нет доступных креативов.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {allCreatives.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCreatives.includes(c.id)}
                      onChange={() => toggleCreative(c.id)}
                      className="rounded"
                    />
                    <span>
                      {c.name}{' '}
                      <span className="text-gray-400">
                        ({c.width}x{c.height}, {c.campaign_name})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </button>
            <button type="button" onClick={() => navigate('/placements')} className="text-gray-500 hover:text-gray-700 text-sm">
              Отмена
            </button>
          </div>
        </form>

        {/* Сниппет для вставки */}
        {form.zone_key && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-3">Код для вставки на сайт</h2>
            <p className="text-sm text-gray-500 mb-3">Скопируйте и вставьте этот код на страницу вашего сайта:</p>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{snippet}</pre>
            <button
              type="button"
              className="mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              onClick={() => navigator.clipboard.writeText(snippet)}
            >
              Скопировать код
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
