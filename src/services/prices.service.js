// src/services/prices.service.js
import { http } from '../lib/http';

// ---------------- Normalizadores ----------------

function normList(x) {
  return {
    id: x.id ?? x.ID ?? null,
    name: x.name ?? x.nombre ?? x.title ?? '',
    currency: x.currency ?? x.moneda ?? 'ARS',
    activo: (x.activo ?? x.active ?? x.enabled ?? true) ? true : false,
    factor: x.factor ?? null,           // opcional: multiplicador para fallback
    notes: x.notes ?? x.notas ?? '',
    raw: x,
  };
}

function normPriceItem(x) {
  return {
    productId: x.productId ?? x.idProducto ?? x.pid ?? null,
    sku: x.sku ?? x.codigo ?? '',
    name: x.productName ?? x.name ?? x.nombre ?? '',
    price: Number(x.price ?? x.precio ?? 0) || 0,
    currency: x.currency ?? x.moneda ?? 'ARS',
    activo: (x.activo ?? x.active ?? true) ? true : false,
    raw: x,
  };
}

// ------------- Bases tolerantes de endpoint -------------

const BASES = ['/prices', '/price-lists', '/pricelists', '/lists/prices'];

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
async function tryPut(path, payload) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.put(`${b}${path}`, payload);
      return { ok: true, data, base: b };
    } catch (e) { lastErr = e; }
  }
  return { ok: false, err: lastErr };
}
async function tryDelete(path) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.delete(`${b}${path}`);
      return { ok: true, data, base: b };
    } catch (e) { lastErr = e; }
  }
  return { ok: false, err: lastErr };
}

// ----------------- Listas: búsqueda/CRUD -----------------

export async function searchPriceLists({ page = 1, limit = 20, q = '', sort } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  // 1) /search
  let r = await tryGet(`/search?${qs.toString()}`);
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    return {
      items: arr.map(normList),
      page: r.data?.page ?? page,
      total: r.data?.total,
      pages: r.data?.pages,
      _base: r.base,
    };
  }

  // 2) listado plano
  r = await tryGet('');
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    const start = (page - 1) * limit;
    const slice = arr.slice(start, start + limit);
    return {
      items: slice.map(normList),
      page,
      total: arr.length,
      pages: Math.max(1, Math.ceil(arr.length / limit)),
      _base: r.base,
    };
  }

  return { items: [], page, total: 0, pages: 1, _base: null };
}

export async function fetchPriceListById(id) {
  const r = await tryGet(`/${id}`);
  if (!r.ok) return null;
  const obj =
    (r.data && typeof r.data === 'object' && !Array.isArray(r.data) && (r.data.id ?? r.data.ID) != null)
      ? r.data
      : r.data?.data ?? r.data;
  return obj ? normList(obj) : null;
}

export async function createPriceList(payload) {
  const body = {
    name: payload.name?.trim() || '',
    currency: payload.currency || 'ARS',
    activo: payload.activo ?? true,
    factor: payload.factor ?? null,
    notes: payload.notes ?? '',
  };
  const r = await tryPost('', body);
  if (!r.ok) throw r.err || new Error('No se pudo crear la lista');
  return r.data;
}

export async function updatePriceList(id, payload) {
  const body = {
    name: payload.name?.trim() || '',
    currency: payload.currency || 'ARS',
    activo: payload.activo ?? true,
    factor: payload.factor ?? null,
    notes: payload.notes ?? '',
  };
  const r = await tryPut(`/${id}`, body);
  if (!r.ok) throw r.err || new Error('No se pudo actualizar la lista');
  return r.data;
}

export async function deletePriceList(id) {
  const r = await tryDelete(`/${id}`);
  if (!r.ok) throw r.err || new Error('No se pudo eliminar la lista');
  return r.data;
}

// --------------- Ítems de lista (precios por producto) ----------------

/**
 * Busca ítems/precios de una lista.
 * Intenta:
 *  - GET /prices/:id/items?...
 *  - GET /price-lists/:id/items?...
 *  - GET /pricelists/:id/items?...
 */
export async function searchPriceItems({ listId, page = 1, limit = 20, q = '', sort } = {}) {
  if (!listId) return { items: [], page, total: 0, pages: 1, _base: null };

  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  let r = await tryGet(`/${listId}/items?${qs.toString()}`);
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    return {
      items: arr.map(normPriceItem),
      page: r.data?.page ?? page,
      total: r.data?.total,
      pages: r.data?.pages,
      _base: r.base,
    };
  }

  // Fallback: algunos backends devuelven todos los ítems junto con la lista
  r = await tryGet(`/${listId}`);
  if (r.ok) {
    const obj = (r.data?.data ?? r.data) || {};
    const arr = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.prices) ? obj.prices : [];
    const start = (page - 1) * limit;
    const slice = arr.slice(start, start + limit);
    return {
      items: slice.map(normPriceItem),
      page,
      total: arr.length || undefined,
      pages: arr.length ? Math.max(1, Math.ceil(arr.length / limit)) : undefined,
      _base: r.base,
    };
  }

  return { items: [], page, total: 0, pages: 1, _base: null };
}

/**
 * Crea/actualiza precio de un producto dentro de una lista.
 * Intenta:
 *  - POST /prices/:id/items  {productId, price, currency}
 *  - PUT  /prices/:id/items/:productId  {price, currency}
 */
export async function upsertPriceItem(listId, { productId, price, currency = 'ARS', activo = true }) {
  if (!listId || !productId) throw new Error('Faltan listId o productId');
  // Intento 1: POST colección
  let r = await tryPost(`/${listId}/items`, { productId, price, currency, activo });
  if (r.ok) return r.data;
  // Intento 2: PUT directo a recurso
  r = await tryPut(`/${listId}/items/${productId}`, { price, currency, activo });
  if (!r.ok) throw r.err || new Error('No se pudo guardar el precio');
  return r.data;
}

export async function deletePriceItem(listId, productId) {
  if (!listId || !productId) throw new Error('Faltan listId o productId');
  const r = await tryDelete(`/${listId}/items/${productId}`);
  if (!r.ok) throw r.err || new Error('No se pudo eliminar el precio');
  return r.data;
}

// ---------------- Helper para Ventas/Productos ----------------

/**
 * Calcula precio efectivo para un producto dado una lista:
 * 1) Si hay override en la lista → usarlo
 * 2) Sino, usar product.precioLista (o product.price) y aplicar factor de la lista (si viene)
 */
export function getPriceForProduct({ product, list, listItemsMap }) {
  if (!product) return 0;

  const pid = product.id ?? product.productId ?? null;

  // 1) Override pasado ya mapeado
  if (listItemsMap && pid != null && listItemsMap.has(pid)) {
    const val = Number(listItemsMap.get(pid)) || 0;
    if (val > 0) return val;
  }

  // 2) Override embebido en el producto (ej: product.pricesByList)
  const candidates =
    product.pricesByList ??
    product.prices ??
    product.listaPrecios ??
    [];
  if (Array.isArray(candidates) && pid != null) {
    const found = candidates.find(p => (p.listId ?? p.priceListId ?? p.listaId) === (list?.id ?? null));
    if (found && Number(found.price ?? found.precio) > 0) {
      return Number(found.price ?? found.precio);
    }
  }

  // 3) Fallback a precio base del producto
  const base =
    Number(product.precioLista ?? product.price ?? product.precio ?? 0) || 0;

  // Aplicar factor de la lista (si hay y tiene sentido)
  const factor = Number(list?.factor ?? 1) || 1;
  return base > 0 ? base * factor : 0;
}
// Compat alias para el front (acepta forma por objetos o posicional)
export function resolvePrice(a, b, c) {
    // Soporta resolvePrice({ product, list, listItemsMap })
    if (a && typeof a === 'object' && ('product' in a || 'list' in a)) {
      return getPriceForProduct(a);
    }
    // Soporta resolvePrice(product, list, listItemsMap)
    return getPriceForProduct({ product: a, list: b, listItemsMap: c });
  }