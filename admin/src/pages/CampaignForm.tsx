import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCampaign, createCampaign, updateCampaign } from '../api';

export default function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '',
    status: 'active',
    daily_budget: 0,
    total_budget: 0,
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      getCampaign(Number(id)).then((c) =>
        setForm({
          name: c.name,
          status: c.status,
          daily_budget: c.daily_budget || 0,
          total_budget: c.total_budget || 0,
          start_date: c.start_date ? c.start_date.slice(0, 16) : '',
          end_date: c.end_date ? c.end_date.slice(0, 16) : '',
        })
      );
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateCampaign(Number(id), form);
      } else {
        await createCampaign(form);
      }
      navigate('/campaigns');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Редактировать кампанию' : 'Новая кампания'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 max-w-lg space-y-5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="active">Активна</option>
            <option value="paused">Пауза</option>
            <option value="archived">Архив</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дневной бюджет</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.daily_budget}
              onChange={(e) => set('daily_budget', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Общий бюджет</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.total_budget}
              onChange={(e) => set('total_budget', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Окончание</label>
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </button>
          <button type="button" onClick={() => navigate('/campaigns')} className="text-gray-500 hover:text-gray-700 text-sm">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
