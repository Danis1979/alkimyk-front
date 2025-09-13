import { http } from '../lib/http';

const shape = (data, page, limit) => {
  const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  const total = Number.isFinite(data?.total) ? data.total : items.length;
  return { items, total, page, limit };
};

export async function fetchOrders(params = {}) {
  const limit = Number.isFinite(params.limit) ? params.limit : 20;
  const page  = Number.isFinite(params.page)  ? params.page  : 1;

  const qs = new URLSearchParams();
  if (params.q)      qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.from)   qs.set('from', params.from);
  if (params.to)     qs.set('to', params.to);
  qs.set('limit', String(limit));
  qs.set('page',  String(page));

  // 1) /orders/search
  try {
    const r = await http.get(`/orders/search?${qs.toString()}`);
    return shape(r.data, page, limit);
  } catch (err) {
    const s = err?.response?.status;
    // 2) fallback /orders con mismos params ante 404/405/5xx o error de red
    if (!s || s === 404 || s === 405 || s >= 500) {
      try {
        const r2 = await http.get(`/orders?${qs.toString()}`);
        return shape(r2.data, page, limit);
      } catch (err2) {
        console.warn('orders API offline, usando vacío', {
          s1: s, d1: err?.response?.data,
          s2: err2?.response?.status, d2: err2?.response?.data
        });
        // 3) último recurso: lista vacía para no romper la UI
        return { items: [], total: 0, page, limit };
      }
    }
    // Si fue un 400/422 real de validación, propagamos
    throw err;
  }
}

export async function fetchOrderById(id) {
  try {
    const r = await http.get(`/orders/${encodeURIComponent(id)}`);
    return r.data;
  } catch (err) {
    const s = err?.response?.status;
    if (!s || s >= 500) {
      console.warn('orders/:id offline, devolviendo placeholder');
      return null; // el detalle mostrará "no disponible"
    }
    throw err;
  }
}
