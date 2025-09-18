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
  const { data } = await http.get(`/orders/${id}`);
  return data;
}
