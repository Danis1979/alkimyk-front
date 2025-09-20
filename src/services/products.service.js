// src/services/products.service.js
import { http } from '../lib/http';

// Normaliza el producto a nuestro shape interno
function normProduct(p = {}) {
  const id =
    p.id ??
    p.productId ??
    p._id ??
    null;

  const nombre =
    p.nombre ??
    p.name ??
    p.title ??
    '';

  const sku =
    p.sku ??
    p.code ??
    '';

  const uom =
    p.uom ??
    p.unidad ??
    p.unidadMedida ??
    '';

  const tipo =
    p.tipo ??
    p.type ??
    'simple'; // 'rellena' | 'simple'

  const costoStd = Number.isFinite(Number(p.costoStd)) ? Number(p.costoStd) :
                   Number.isFinite(Number(p.costo))    ? Number(p.costo)    :
                   0;

  const precioLista = Number.isFinite(Number(p.precioLista)) ? Number(p.precioLista) :
                      Number.isFinite(Number(p.price))       ? Number(p.price)       :
                      0;

  const activo =
    (p.activo !== undefined ? p.activo :
     p.active !== undefined ? p.active : true) ? true : false;

  return { id, nombre, sku, uom, tipo, costoStd, precioLista, activo, raw: p };
}

// Prepara payload al contrato del backend (nombre en español por defecto)
function toBackendPayload(p = {}) {
  return {
    id: p.id,
    nombre: p.nombre ?? p.name ?? '',
    sku: p.sku ?? '',
    uom: p.uom ?? '',
    tipo: p.tipo ?? 'simple',
    costoStd: Number.isFinite(Number(p.costoStd)) ? Number(p.costoStd) : 0,
    precioLista: Number.isFinite(Number(p.precioLista)) ? Number(p.precioLista) : 0,
    activo: !!(p.activo ?? true),
  };
}

// Búsqueda con paginado + tolerante a distintos formatos
export async function searchProducts({ page = 1, limit = 20, sort = 'nombre', q, onlyActive } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (q) qs.set('q', q);
  if (onlyActive !== undefined) qs.set('onlyActive', String(!!onlyActive));

  // 1) Preferido
  try {
    const { data } = await http.get(`/products/search?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return {
      items: arr.map(normProduct),
      page:  data?.page  ?? page,
      pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(Number(data.total) / limit)) : undefined),
      total: data?.total,
      meta:  data?.meta,
    };
  } catch (_) { /* sigue */ }

  // 2) Fallback: /products (puede ser array directo)
  try {
    const { data } = await http.get(`/products?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return {
      items: arr.map(normProduct),
      page,
      pages: arr.length === limit ? page + 1 : page, // heurística
      total: Array.isArray(data?.items) ? Number(data?.total ?? arr.length) : arr.length,
      meta: data?.meta,
    };
  } catch (e) {
    return { items: [], page, pages: 1, total: 0, error: e?.message ?? 'No disponible' };
  }
}

export async function getProductById(id) {
  const urls = [`/products/${id}`, `/products/${id}/full`];
  for (const u of urls) {
    try {
      const { data } = await http.get(u);
      return normProduct(data);
    } catch (_) {}
  }
  return normProduct({ id });
}

export async function createProduct(patch) {
  const payload = toBackendPayload(patch);
  const { data } = await http.post('/products', payload);
  return normProduct(data ?? payload);
}

export async function updateProduct(id, patch) {
  const payload = toBackendPayload({ ...patch, id });
  // Preferimos PATCH; si no está implementado, probamos PUT
  try {
    const { data } = await http.patch(`/products/${id}`, payload);
    return normProduct(data ?? payload);
  } catch (_) {
    const { data } = await http.put(`/products/${id}`, payload);
    return normProduct(data ?? payload);
  }
}

export async function deleteProduct(id) {
  await http.delete(`/products/${id}`);
  return { ok: true };
}