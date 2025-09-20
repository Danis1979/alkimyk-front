// src/services/purchases.service.js
import { http } from '../lib/http';

// Normaliza filas (nombres de campos variables)
function normPurchase(r) {
  return {
    id: r.id,
    fecha: r.fecha ?? r.date ?? null,
    supplier: r.supplier ?? r.proveedor ?? r.supplierName ?? r.vendor ?? '',
    total: r.total ?? r.subtotal ?? 0,
    raw: r,
  };
}

export async function searchPurchases({ page = 1, limit = 20, sort = '-fecha', from, to, q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (from) qs.set('from', from);
  if (to)   qs.set('to', to);
  if (q)    qs.set('q', q);

  // Backend final esperado
  try {
    const { data } = await http.get(`/purchases/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items: items.map(normPurchase),
      page: data?.page ?? page,
      pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
      total: data?.total,
    };
  } catch {
    // Fallback si expone array plano
    try {
      const { data } = await http.get(`/purchases?${qs.toString()}`);
      const items = Array.isArray(data) ? data : [];
      return { items: items.map(normPurchase), page, pages: undefined, total: undefined };
    } catch {
      return { items: [], page, pages: undefined, total: undefined };
    }
  }
}

export async function createPurchase(payload) {
  const { data } = await http.post('/purchases', payload);
  return data;
}