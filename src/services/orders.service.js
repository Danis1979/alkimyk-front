import { http } from '../lib/http.js';

export async function fetchOrders({ q='', from='', to='', page=1, limit=10 } = {}) {
  try {
    const params = { page, limit };
    if (q) params.q = q;
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await http.get('/orders/search', { params });

    const items = Array.isArray(data?.items) ? data.items : [];
    const total = Number.isFinite(data?.total) ? data.total : items.length;
    return { total, items, meta: data?.meta || null };
  } catch (e) {
    return { total: 0, items: [], meta: null, error: e?.response?.data || String(e) };
  }
}

export async function fetchOrderById(id) {
  try {
    const { data } = await http.get(`/orders/${id}`);
    return data || null;
  } catch {
    return null;
  }
}
