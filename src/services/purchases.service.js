import { http } from '../lib/http';

function normPurchase(s) {
  return {
    id: s.id,
    fecha: s.fecha ?? s.date ?? null,
    supplier: s.supplier ?? s.proveedor ?? s.supplierName ?? s.vendor ?? '',
    total: s.total ?? s.subtotal ?? 0,
    raw: s,
  };
}

export async function searchPurchases({ page = 1, limit = 20, sort = '-fecha', from, to, q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (from) qs.set('from', from);
  if (to)   qs.set('to', to);
  if (q)    qs.set('q', q);

  try {
    // Backend final esperado
    const { data } = await http.get(`/purchases/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items: items.map(normPurchase),
      page: data?.page ?? page,
      pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
      total: data?.total,
    };
  } catch {
    // Si aún no existe el endpoint, devolvemos vacío para no romper la UI
    return { items: [], page, pages: 1, total: 0 };
  }
}

export async function fetchPurchaseById(id) {
  const urls = [`/purchases/${id}/full`, `/purchases/${id}`];
  for (const u of urls) {
    try {
      const { data } = await http.get(u);
      return data;
    } catch (_) {}
  }
  return { id, items: [] };
}

export async function createPurchase(payload) {
  const { data } = await http.post('/purchases', payload);
  return data;
}
