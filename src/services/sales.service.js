// src/services/sales.service.js
import { http } from '../lib/http';

// Normaliza campos que pueden venir como "fecha" o "date", "client" o "cliente"
function normSale(s) {
  return {
    id: s.id,
    fecha: s.fecha ?? s.date ?? null,
    client: s.client ?? s.cliente ?? s.clientName ?? s.customer ?? '',
    total: s.total ?? s.subtotal ?? 0,
    raw: s,
  };
}

export async function searchSales({ page = 1, limit = 20, sort = '-fecha', from, to, q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (from) qs.set('from', from);
  if (to)   qs.set('to', to);
  if (q)    qs.set('q', q);

  // Backend final
  try {
    const { data } = await http.get(`/sales/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items: items.map(normSale),
      page: data?.page ?? page,
      pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
      total: data?.total,
    };
  } catch (e) {
    // Fallback (por si el backend expone sólo array)
    return { items: [], page, pages: 1, total: 0 };
  }
}

export async function fetchSaleById(id) {
  // Prioriza detalle “full” si existe
  const urls = [`/sales/${id}/full`, `/sales/${id}`];
  for (const u of urls) {
    try {
      const { data } = await http.get(u);
      return data;
    } catch (_) {}
  }
  return { id, items: [] };
}

export async function createSale(payload) {
  const { data } = await http.post('/sales', payload);
  return data;
}