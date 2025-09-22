// src/services/sales.service.js
import { http } from '../lib/http';
import { fetchOrderById } from './orders.service';

// Busca “ventas” usando el search de órdenes con un status típico de facturado/confirmado.
// En el fallback legacy, el status se ignora y te devuelve todo igual (está ok por ahora).
export async function searchSales({
  page = 1,
  limit = 20,
  from,
  to,
  clientEmail,
} = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });

  // status por ahora fijo en CONFIRMADO como aproximación de “ventas”
  qs.set('status', 'CONFIRMADO');
  if (from) qs.set('date_from', from);
  if (to) qs.set('date_to', to);
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

// Hasta que exista /sales/:id, usamos el detalle de order como “detalle de venta”
export function fetchOrders(opts) { return searchOrders(opts); }
export async function fetchSaleById(id) {
  return fetchOrderById(id);
}