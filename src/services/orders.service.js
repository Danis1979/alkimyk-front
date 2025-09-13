import { http } from '../lib/http';

function mapItemsSafe(items = []) {
  return items.map((r) => ({
    id: r.id ?? r.ID ?? r.docNumber ?? r.numero ?? Math.random().toString(36).slice(2),
    date: r.date ?? r.issuedAt ?? r.fecha ?? r.created_at ?? r.createdAt ?? null,
    client: r.client ?? r.cliente ?? r.customer ?? null,
    total: Number(r.total ?? r.monto ?? r.amount ?? 0),
    _raw: r
  }));
}

/**
 * Obtiene lista/paginado. Intenta /orders/search y cae a /orders si hace falta.
 */
export async function fetchOrders({ page = 1, limit = 10, q = '', from, to, signal } = {}) {
  const params = { page, limit };
  if (q) params.q = q;
  if (from) params.from = from;
  if (to) params.to = to;

  try {
    const r = await http.get('/orders/search', { params, signal });
    const data = r.data || {};
    const total = Number(data.total ?? 0);
    const items = mapItemsSafe(data.items);
    const pages = total && limit ? Math.max(1, Math.ceil(total / limit)) : 1;
    return { total, items, page, limit, pages, meta: data.meta ?? null };
  } catch (e1) {
    // fallback
    try {
      const r2 = await http.get('/orders', { params, signal });
      const data = r2.data || {};
      const total = Number(data.total ?? 0);
      const items = mapItemsSafe(data.items);
      const pages = total && limit ? Math.max(1, Math.ceil(total / limit)) : 1;
      return { total, items, page, limit, pages, meta: data.meta ?? null };
    } catch (e2) {
      console.warn('orders API offline, usando vacío –', { e1, e2 });
      return { total: 0, items: [], page, limit, pages: 1, meta: null };
    }
  }
}

/**
 * Detalle por id (sin magia, deja el _raw para inspección).
 */
export async function fetchOrderById(id, { signal } = {}) {
  try {
    const r = await http.get(`/orders/${id}`, { signal });
    const d = r.data || null;
    if (!d) return null;
    return {
      id: d.id ?? id,
      date: d.date ?? d.issuedAt ?? d.fecha ?? null,
      client: d.client ?? d.cliente ?? null,
      total: Number(d.total ?? 0),
      _raw: d
    };
  } catch (e) {
    console.warn('fetchOrderById failed –', e?.response?.status, e?.response?.data);
    return null;
  }
}
