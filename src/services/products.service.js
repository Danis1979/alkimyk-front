// src/services/products.service.js
import { http } from '../lib/http';

// Normalización a tu modelo
export function normalizeProduct(p = {}) {
  return {
    id: p.id,
    sku: p.sku ?? p.code ?? '',
    name: p.name ?? p.nombre ?? '',
    uom: p.uom ?? p.unidad ?? p.unit ?? '',
    tipo: p.tipo ?? p.type ?? 'simple',                 // 'rellena' | 'simple'
    costoStd: Number(p.costoStd ?? p.costStd ?? p.costo ?? 0) || 0,
    precioLista: Number(p.precioLista ?? p.listPrice ?? p.precio ?? 0) || 0,
    activo: !!(p.activo ?? p.active ?? true),
    _raw: p,
  };
}

// Convierte el form al payload del backend (campos canónicos)
function toPayload(x) {
  return {
    id: x.id,
    sku: x.sku?.trim() || null,
    name: x.name?.trim() || null,
    uom: x.uom?.trim() || null,
    tipo: x.tipo || 'simple',
    costoStd: Number(x.costoStd) || 0,
    precioLista: Number(x.precioLista) || 0,
    activo: !!x.activo,
  };
}

export async function searchProducts({ page = 1, limit = 20, q = '', sort = 'name' } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  // 1) Intento estándar
  try {
    const { data } = await http.get(`/products/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const total = data?.total ?? undefined;
    const pages = data?.pages ?? (total ? Math.max(1, Math.ceil(total / limit)) : undefined);
    return {
      items: items.map(normalizeProduct),
      page: data?.page ?? page,
      pages,
      total,
    };
  } catch (_) {}

  // 2) Fallback: /products (paginado o no)
  try {
    const { data } = await http.get(`/products?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const total = data?.total ?? undefined;
    const pages = data?.pages ?? (total ? Math.max(1, Math.ceil(total / limit)) : undefined);
    return {
      items: arr.map(normalizeProduct),
      page,
      pages,
      total,
    };
  } catch (e) {
    // Último recurso
    return { items: [], page, pages: 1, total: 0 };
  }
}

export async function createProduct(form) {
  const payload = toPayload(form);
  const { data } = await http.post('/products', payload);
  return normalizeProduct(data ?? payload);
}

export async function updateProduct(id, form) {
  const payload = toPayload({ ...form, id });
  try {
    const { data } = await http.put(`/products/${id}`, payload);
    return normalizeProduct(data ?? payload);
  } catch (_) {
    const { data } = await http.patch(`/products/${id}`, payload);
    return normalizeProduct(data ?? payload);
  }
}

export async function deleteProduct(id) {
  await http.delete(`/products/${id}`);
  return true;
}