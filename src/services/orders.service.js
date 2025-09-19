// src/services/orders.service.js
import { http } from '../lib/http';

/**
 * Lista de ventas/pedidos con paginación, orden y búsqueda.
 * @param {Object} opts
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=20]
 * @param {string} [opts.sort='-date']   // ej: '-date', 'date', '-total', 'total'
 * @param {string} [opts.q='']           // filtro por cliente (depende del backend)
 */
export async function fetchOrders({
  page = 1,
  limit = 20,
  sort = '-date',
  q = '',
} = {}) {
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  if (sort) qs.set('sort', sort);
  if (q && q.trim()) qs.set('q', q.trim());

  const { data } = await http.get(`/orders/search?${qs.toString()}`);
  return data;
}

/** Alias por compatibilidad con el resto del front */
export async function fetchOrdersSearch(args) {
  return fetchOrders(args);
}

/**
 * Detalle de una venta/pedido por ID.
 * Intenta primero /orders/:id/full y si no existe, cae a /orders/:id
 */
export async function fetchOrderById(id) {
  const tryUrls = [`/orders/${id}/full`, `/orders/${id}`];
  for (const u of tryUrls) {
    try {
      const { data } = await http.get(u);
      if (data) return data;
    } catch (_) {
      // sigue intentando siguiente URL
    }
  }
  // Fallback seguro para que el front no explote
  return { id, items: [] };
}