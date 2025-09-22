// src/services/orders.service.js
import { http } from '../lib/http';

export async function searchOrders({
  page = 1,
  limit = 20,
  from,
  to,
  status,
  clientEmail,
} = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (from) qs.set('date_from', from);
  if (to) qs.set('date_to', to);
  if (status) qs.set('status', status);
  if (clientEmail) qs.set('clientEmail', clientEmail);

  const { data } = await http.get(`/orders/search?${qs.toString()}`);

  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items: items.map((o) => ({
      id: o.id,
      date: o.createdAt ?? o.date ?? null,
      client:
        typeof o.client === 'string'
          ? o.client
          : o.client?.name ?? o.client?.email ?? '',
      total: typeof o.subtotal === 'number' ? o.subtotal : (o.total ?? 0),
      raw: o,
    })),
    total: data?.total ?? items.length,
    page,
    pages: Math.max(1, Math.ceil((data?.total ?? items.length) / limit)),
  };
}

export async function fetchOrderById(id) {
  // primero intento "full"
  try {
    const { data } = await http.get(`/orders/${id}/full`);
    if (data) return data;
  } catch (_) {
    // ignore y seguimos al fallback
  }
  // fallback simple
  const { data } = await http.get(`/orders/${id}`);
  return data;
}
// Back-compat: algunas pantallas siguen importando fetchOrders
export const fetchOrders = searchOrders;
