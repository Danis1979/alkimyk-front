import { http } from '../lib/http';

export async function fetchOrders({ page=1, limit=20, sort } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  const { data } = await http.get(`/orders/search?${qs.toString()}`);
  return data;
}

export async function fetchOrdersSearch(args) {
  return fetchOrders(args);
}

export async function fetchOrderById(id) {
  const tryUrls = [`/orders/${id}/full`, `/orders/${id}`];
  for (const u of tryUrls) {
    try {
      const { data } = await http.get(u);
      if (data) return data;
    } catch (_) {}
  }
  return { id, items: [] };
}
