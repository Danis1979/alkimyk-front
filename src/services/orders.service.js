import { http } from '../lib/http.js';

export async function fetchOrders({ page=1, limit=10, q='', from='', to='' } = {}) {
  const params = {};
  if (page)  params.page  = Number(page);
  if (limit) params.limit = Number(limit);
  if (q)     params.q     = q;
  if (from)  params.from  = from;
  if (to)    params.to    = to;

  const r = await http.get('/orders/search', { params });
  return r.data; // { total, items, meta? }
}

export async function fetchOrderById(id) {
  const r = await http.get(`/orders/${id}`);
  return r.data;
}
