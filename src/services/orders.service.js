// src/services/orders.service.js
import { http } from '../lib/http';

// Limpieza mínima del nombre (quita coma final, recorta, colapsa espacios)
function cleanClientName(s) {
  if (!s) return '';
  return String(s)
    .replace(/\s*,\s*$/, '') // coma final
    .replace(/\s+/g, ' ')    // espacios múltiples
    .trim();
}

function normOrder(o, origin) {
  return {
    id: o.id,
    date: o.date ?? o.fecha ?? null,
    client: cleanClientName(o.client ?? o.cliente ?? o.clientName ?? o.customer ?? ''),
    total: o.total ?? o.subtotal ?? 0,
    _origin: origin,   // 'sales' si vino de /sales/search, 'orders' si vino de /orders/search
    _raw: o,
  };
}

// Busca primero el endpoint “final” de ventas; si no existe, usa /orders/search (el que ya te funciona)
export async function fetchOrders({ page = 1, limit = 20, sort, q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (q)    qs.set('q', q);

  // 1) Intento /sales/search (si tu backend lo tiene activo)
  try {
    const { data } = await http.get(`/sales/search?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items
              : Array.isArray(data)        ? data
              : [];
    return {
      items: arr.map((x) => normOrder(x, 'sales')),
      page : data?.page  ?? page,
      pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
      total: data?.total,
    };
  } catch (_) {
    // seguimos al fallback
  }

  // 2) Fallback robusto: /orders/search (ya verificado en prod)
  const { data } = await http.get(`/orders/search?${qs.toString()}`);
  const list = Array.isArray(data?.items) ? data.items
             : Array.isArray(data)        ? data
             : [];
  return {
    items: list.map((x) => normOrder(x, 'orders')),
    page : data?.page  ?? page,
    pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
    total: data?.total,
  };
}

// Alias histórico (si alguna página aún lo importa)
export const fetchOrdersSearch = fetchOrders;

// Detalle por id: prioriza /orders/:id/full si existe
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