import { http } from '../lib/http';

/**
 * Busca pedidos/ventas con normalización para la tabla.
 * Soporta filtros: from/to (YYYY-MM-DD), status, clientEmail, page/limit.
 * Devuelve: { items:[{id,date,client,total,raw}], total, page, pages }
 */
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
    items: items.map(o => ({
      id: o.id,
      date: o.createdAt ?? o.date ?? null,
      client: o.client ?? '',
      total: typeof o.subtotal === 'number' ? o.subtotal : (o.total ?? 0),
      raw: o,
    })),
    total: data?.total ?? items.length,
    page,
    pages: Math.max(1, Math.ceil((data?.total ?? items.length) / limit)),
  };
}

/** Compat: para imports viejos que esperan fetchOrdersSearch */
export { searchOrders as fetchOrdersSearch };

/**
 * Detalle de pedido: intenta /orders/:id/full y cae a /orders/:id
 */
export async function fetchOrderById(id) {
  try {
    const { data } = await http.get(`/orders/${id}/full`);
    return data;
  } catch (_e) {
    const { data } = await http.get(`/orders/${id}`);
    return data;
  }
}