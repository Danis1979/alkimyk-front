import { http } from '../lib/http';

export async function fetchOrders({ page=1, limit=10, from='', to='', q='' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (from) params.set('from', from);
  if (to)   params.set('to', to);
  if (q)    params.set('q', q);
  try {
    const { data } = await http.get(`/orders/search?${params.toString()}`);
    return {
      total: Number(data?.total||0),
      items: Array.isArray(data?.items) ? data.items : [],
      meta: data?.meta ?? null,
      page, limit, from, to, q,
    };
  } catch (e) {
    // fallback soft
    return { total: 0, items: [], meta: { error: 'orders_fetch_failed' }, page, limit, from, to, q };
  }
}

export async function fetchOrderById(id) {
  try {
    const { data } = await http.get(`/orders/${id}`);
    const raw = data?._raw || data || null;
    if (!raw) return null;
    return {
      id: raw.id ?? id,
      date: raw.date || raw.created_at || raw.fecha || null,
      client: raw.client || raw.cliente || null,
      total: raw.total ?? null,
      _raw: raw
    };
  } catch {
    return null;
  }
}
