const BASE = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY;

function defaultHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return h;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...defaultHeaders(), ...(options?.headers as Record<string, string>) },
    ...options,
  });
  if (res.status === 204) return null as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Кампании
export const getCampaigns = () => request<any[]>('/campaigns');
export const getCampaign = (id: number) => request<any>(`/campaigns/${id}`);
export const createCampaign = (data: any) => request<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) });
export const updateCampaign = (id: number, data: any) => request<any>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCampaign = (id: number) => request<any>(`/campaigns/${id}`, { method: 'DELETE' });

// Креативы
export const getCreatives = (campaignId?: number) =>
  request<any[]>(campaignId ? `/creatives?campaign_id=${campaignId}` : '/creatives');
export const getCreative = (id: number) => request<any>(`/creatives/${id}`);
export const createCreative = (data: any) => request<any>('/creatives', { method: 'POST', body: JSON.stringify(data) });
export const updateCreative = (id: number, data: any) => request<any>(`/creatives/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCreative = (id: number) => request<any>(`/creatives/${id}`, { method: 'DELETE' });

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const headers: Record<string, string> = {};
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  const res = await fetch(`${BASE}/creatives/upload`, { method: 'POST', body: form, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Ошибка загрузки');
  }
  return res.json();
}

// Площадки
export const getPlacements = () => request<any[]>('/placements');
export const getPlacement = (id: number) => request<any>(`/placements/${id}`);
export const createPlacement = (data: any) => request<any>('/placements', { method: 'POST', body: JSON.stringify(data) });
export const updatePlacement = (id: number, data: any) => request<any>(`/placements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePlacement = (id: number) => request<any>(`/placements/${id}`, { method: 'DELETE' });
export const setPlacementCreatives = (id: number, creativeIds: number[]) =>
  request<any>(`/placements/${id}/creatives`, { method: 'POST', body: JSON.stringify({ creative_ids: creativeIds }) });

// Статистика
export const getStatsSummary = () => request<any>('/stats/summary');
export const getDailyStats = (days?: number) => request<any[]>(`/stats/daily?days=${days || 30}`);
export const flushStats = () => request<any>('/stats/flush', { method: 'POST' });
