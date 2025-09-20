// src/services/purchases.service.js
import { http } from '../lib/http';

// Normaliza filas de listados
function normPurchase(r) {
  return {
    id: r.id,
    fecha: r.fecha ?? r.date ?? null,
    supplier: r.supplier ?? r.proveedor ?? r.supplierName ?? r.vendor ?? '',
    total: r.total ?? r.subtotal ?? 0,
    raw: r,
  };
}

// Normaliza un detalle (header + items)
function normPurchaseDetail(x) {
  const header = {
    id: x.id,
    fecha: x.fecha ?? x.date ?? null,
    supplier: x.supplier ?? x.proveedor ?? x.supplierName ?? '',
    pm: x.pm ?? x.medioPago ?? '',
    estado: x.estado ?? x.status ?? '',
    subtotal: x.subtotal ?? x.total ?? 0,
    iva: x.iva ?? 0,
    total: x.total ?? x.subtotal ?? 0,
  };
  const items = Array.isArray(x.items)
    ? x.items.map((i) => {
        const qty = i.qty ?? i.cantidad ?? 0;
        const price = i.price ?? i.precio ?? 0;
        return {
          productId: i.productId ?? i.insumoId ?? null,
          product: i.product ?? i.insumo ?? i.name ?? '',
          qty,
          price,
          lineTotal: qty * price,
        };
      })
    : [];
  return { ...header, items, raw: x };
}

export async function searchPurchases({ page = 1, limit = 20, sort = '-fecha', from, to, q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (from) qs.set('from', from);
  if (to)   qs.set('to', to);
  if (q)    qs.set('q', q);

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
    try {
      const { data } = await http.get(`/purchases?${qs.toString()}`);
      const items = Array.isArray(data) ? data : [];
      return { items: items.map(normPurchase), page, pages: undefined, total: undefined };
    } catch {
      return { items: [], page, pages: undefined, total: undefined };
    }
  }
}

export async function fetchPurchaseById(id) {
  const urls = [`/purchases/${id}/full`, `/purchases/${id}`];
  for (const u of urls) {
    try {
      const { data } = await http.get(u);
      if (data) return normPurchaseDetail(data);
    } catch (_) {}
  }
  return { id, fecha: null, supplier: '', pm: '', estado: '', items: [], subtotal: 0, iva: 0, total: 0 };
}

export async function createPurchase(payload) {
  const { data } = await http.post('/purchases', payload);
  return data;
}