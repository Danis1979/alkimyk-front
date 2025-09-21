import { http } from '../lib/http';

// Normalizador compra
function normPurchase(x) {
  return {
    id: x.id ?? x.ID ?? null,
    fecha: x.fecha ?? x.date ?? null,
    supplierId: x.supplierId ?? x.proveedorId ?? x.vendorId ?? null,
    supplier: x.supplier ?? x.proveedor ?? x.vendor ?? x.supplierName ?? '',
    total: x.total ?? x.subtotal ?? 0,
    items: Array.isArray(x.items) ? x.items : [],
    raw: x,
  };
}

const BASES = ['/purchases', '/compras'];

async function tryGet(path) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.get(`${b}${path}`);
      return { ok: true, data, base: b };
    } catch (e) { lastErr = e; }
  }
  return { ok: false, err: lastErr };
}

async function tryPost(path, payload) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.post(`${b}${path}`, payload);
      return { ok: true, data, base: b };
    } catch (e) { lastErr = e; }
  }
  return { ok: false, err: lastErr };
}

export async function searchPurchases({ page = 1, limit = 20, sort = '-fecha', from, to, q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (from) qs.set('from', from);
  if (to)   qs.set('to', to);
  if (q)    qs.set('q', q);

  // 1) /search
  let r = await tryGet(`/search?${qs.toString()}`);
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    return {
      items: arr.map(normPurchase),
      page: r.data?.page ?? page,
      pages: r.data?.pages ?? (r.data?.total ? Math.max(1, Math.ceil(r.data.total / limit)) : undefined),
      total: r.data?.total,
      _base: r.base,
    };
  }

  // 2) listado plano
  r = await tryGet('');
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    const start = (page - 1) * limit;
    const slice = arr.slice(start, start + limit);
    return { items: slice.map(normPurchase), page, total: arr.length, pages: Math.max(1, Math.ceil(arr.length / limit)), _base: r.base };
  }

  return { items: [], page, total: 0, pages: 1, _base: null };
}

export async function fetchPurchaseById(id) {
  const urls = [`/purchases/${id}/full`, `/purchases/${id}`, `/compras/${id}/full`, `/compras/${id}`];
  for (const u of urls) {
    try { const { data } = await http.get(u); return data; } catch (_) {}
  }
  return { id, items: [] };
}

export async function createPurchase(payload) {
  // payload: { supplierId, supplier, fecha, pm, estado, items:[{productId|insumoId, qty, price}], subtotal, iva, total }
  const body = { ...payload };
  const r = await tryPost('', body);
  if (!r.ok) throw r.err || new Error('No se pudo crear la compra');
  return r.data;
}