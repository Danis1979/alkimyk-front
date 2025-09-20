// src/services/purchases.service.js
import { http } from '../lib/http';

// Normaliza campos posibles del backend
function normPurchase(p = {}) {
  return {
    id: p.id,
    fecha: p.fecha ?? p.date ?? null,
    supplier: p.supplier ?? p.proveedor ?? p.supplierName ?? '',
    total: p.total ?? p.subtotal ?? 0,
    raw: p,
  };
}

export async function searchPurchases({ page = 1, limit = 20, sort = '-fecha', from, to, q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (from) qs.set('from', from);
  if (to)   qs.set('to', to);
  if (q)    qs.set('q', q);

  // Backend final: /purchases/search
  try {
    const { data } = await http.get(`/purchases/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return {
      items: items.map(normPurchase),
      page : data?.page  ?? page,
      pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
      total: data?.total,
    };
  } catch {
    // Fallback: /purchases (lista simple)
    try {
      const { data } = await http.get(`/purchases?${qs.toString()}`);
      const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      return { items: arr.map(normPurchase), page, pages: undefined, total: arr.length };
    } catch {}
    return { items: [], page, pages: 1, total: 0 };
  }
}

export async function fetchPurchaseById(id) {
  const urls = [`/purchases/${id}/full`, `/purchases/${id}`];
  for (const u of urls) {
    try {
      const { data } = await http.get(u);
      return data;
    } catch {}
  }
  return { id, items: [] };
}

export async function createPurchase(payload) {
  const { data } = await http.post('/purchases', payload);
  return data;
}