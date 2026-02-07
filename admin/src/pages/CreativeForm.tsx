import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCampaigns, getCreative, createCreative, updateCreative, uploadImage } from '../api';

export default function CreativeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({
    campaign_id: '',
    name: '',
    type: 'image',
    width: 300,
    height: 250,
    image_url: '',
    click_url: '',
    html_content: '',
    weight: 1,
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getCampaigns().then(setCampaigns);
    if (isEdit) {
      getCreative(Number(id)).then((c) =>
        setForm({
          campaign_id: String(c.campaign_id),
          name: c.name,
          type: c.type,
          width: c.width,
          height: c.height,
          image_url: c.image_url || '',
          click_url: c.click_url || '',
          html_content: c.html_content || '',
          weight: c.weight,
          status: c.status,
        })
      );
    }
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm((prev) => ({ ...prev, image_url: url }));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, campaign_id: Number(form.campaign_id) };
      if (isEdit) {
        await updateCreative(Number(id), data);
      } else {
        await createCreative(data);
      }
      navigate('/creatives');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Редактировать креатив' : 'Новый креатив'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 max-w-lg space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Кампания</label>
          <select
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.campaign_id}
            onChange={(e) => set('campaign_id', e.target.value)}
          >
            <option value="">Выберите кампанию</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
          <input
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="image">Изображение</option>
              <option value="html">HTML</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Вес (ротация)</label>
            <input
              type="number"
              min="1"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.weight}
              onChange={(e) => set('weight', parseInt(e.target.value) || 1)}
            />
          </div>
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

        {form.type === 'image' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Изображение</label>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="text-sm" />
              {uploading && <p className="text-xs text-gray-400 mt-1">Загрузка...</p>}
              {form.image_url && (
                <div className="mt-2 bg-gray-100 rounded-lg p-2 inline-block">
                  <img src={form.image_url} alt="" className="max-h-32" />
                </div>
              )}
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm mt-2"
                placeholder="Или URL изображения"
                value={form.image_url}
                onChange={(e) => set('image_url', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL перехода (клик)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="https://example.com"
                value={form.click_url}
                onChange={(e) => set('click_url', e.target.value)}
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HTML-код баннера</label>
            <textarea
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              value={form.html_content}
              onChange={(e) => set('html_content', e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Активен</option>
            <option value="paused">Пауза</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </button>
          <button type="button" onClick={() => navigate('/creatives')} className="text-gray-500 hover:text-gray-700 text-sm">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
