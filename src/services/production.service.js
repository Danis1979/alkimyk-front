// src/services/production.service.js
import { http } from '../lib/http';

// ---------- Normalizadores ----------
function normOP(x) {
  if (!x || typeof x !== 'object') return null;
  return {
    id: x.id ?? x.ID ?? null,
    fecha: x.fecha ?? x.date ?? null,
    estado: x.estado ?? x.status ?? 'Planificada',
    itemsProd: Array.isArray(x.itemsProd ?? x.productos ?? x.items)
      ? (x.itemsProd ?? x.productos ?? x.items).map((i) => ({
          productId: i.productId ?? i.id ?? null,
          product: i.product ?? i.nombre ?? i.name ?? '',
          qty: Number(i.qty ?? i.cantidad ?? 0),
        }))
      : [],
    consumos: Array.isArray(x.consumos ?? x.insumos)
      ? (x.consumos ?? x.insumos).map((i) => ({
          insumoId: i.insumoId ?? i.productId ?? i.id ?? null,
          insumo: i.insumo ?? i.nombre ?? i.name ?? '',
          qty: Number(i.qty ?? i.cantidad ?? 0),
        }))
      : [],
    raw: x,
  };
}

// Bases probables para producción
const BASES = ['/production', '/production-orders', '/op', '/ops'];

// ---------- Helpers HTTP con fallback ----------
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

async function tryPatch(path, payload) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.patch(`${b}${path}`, payload);
      return { ok: true, data, base: b };
    } catch (e) { lastErr = e; }
  }
  return { ok: false, err: lastErr };
}

// ---------- Búsqueda / listado ----------
export async function searchProductionOrders({
  page = 1, limit = 20, sort = '-fecha', estado = '', from = '', to = '', productId = null, q = '',
} = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (estado) qs.set('estado', estado);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (productId != null) qs.set('productId', String(productId));
  if (q) qs.set('q', q);

  // 1) endpoint paginado /search
  let r = await tryGet(`/search?${qs.toString()}`);
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : (Array.isArray(r.data) ? r.data : []);
    return {
      items: arr.map(normOP).filter(Boolean),
      page: r.data?.page ?? page,
      total: r.data?.total,
      pages: r.data?.pages,
      _base: r.base,
    };
  }

  // 2) listado plano
  r = await tryGet('');
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : (Array.isArray(r.data) ? r.data : []);
    const start = (page - 1) * limit;
    const slice = arr.slice(start, start + limit);
    return {
      items: slice.map(normOP).filter(Boolean),
      page,
      total: arr.length,
      pages: Math.max(1, Math.ceil(arr.length / limit)),
      _base: r.base,
    };
  }

  return { items: [], page, total: 0, pages: 1, _base: null };
}

// ---------- Crear OP ----------
export async function createProductionOrder(payload) {
  // payload esperado: { fecha, itemsProd:[{productId, qty}], consumos:[{insumoId, qty}] }
  const body = {
    fecha: payload.fecha ?? payload.date ?? null,
    itemsProd: (payload.itemsProd ?? []).map(i => ({
      productId: i.productId ?? i.id,
      qty: Number(i.qty ?? i.cantidad ?? 0),
    })),
    consumos: (payload.consumos ?? []).map(i => ({
      insumoId: i.insumoId ?? i.productId ?? i.id,
      qty: Number(i.qty ?? i.cantidad ?? 0),
    })),
  };
  const r = await tryPost('', body);
  if (!r.ok) throw r.err || new Error('No se pudo crear la OP');
  return r.data;
}

// ---------- Acciones estado ----------
export async function startProductionOrder(id) {
  const r = await tryPatch(`/${id}/start`, {});
  if (!r.ok) throw r.err || new Error('No se pudo iniciar la OP');
  return r.data;
}
export async function closeProductionOrder(id) {
  const r = await tryPatch(`/${id}/close`, {});
  if (!r.ok) throw r.err || new Error('No se pudo cerrar la OP');
  return r.data;
}
export async function cancelProductionOrder(id) {
  const r = await tryPatch(`/${id}/cancel`, {});
  if (!r.ok) throw r.err || new Error('No se pudo anular la OP');
  return r.data;
}

// ---------- Recetas (BOM) ----------
const RECIPE_BASES = ['/recipes', '/bom', '/product-recipes'];
export async function fetchRecipe(productId) {
  const pid = Number(productId);
  // Intento 1: /recipes/:productId
  for (const b of RECIPE_BASES) {
    try {
      const { data } = await http.get(`${b}/${pid}`);
      const comps = pickComponents(data);
      comps.componentes = comps; // compat: permite usar arr o obj.componentes
      return comps;
    } catch (_) {}
  }
  // Intento 2: /products/:id/recipe
  try {
    const { data } = await http.get(`/products/${pid}/recipe`);
    const comps = pickComponents(data);
    comps.componentes = comps;
    return comps;
  } catch (_) {}

  // Intento 3: /recipes?productId=...
  try {
    const qs = new URLSearchParams({ productId: String(pid) }).toString();
    const { data } = await http.get(`/recipes?${qs}`);
    const comps = pickComponents(data);
    comps.componentes = comps;
    return comps;
  } catch (_) {}

  const empty = [];
  empty.componentes = empty;
  return empty;
}

function pickComponents(data) {
  // Acepta {componentes:[...]}, {items:[...]}, array plano, etc.
  const raw =
    (Array.isArray(data?.componentes) && data.componentes) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data) && data) ||
    [];

  return raw.map((c) => ({
    insumoId: c.insumoId ?? c.productId ?? c.id ?? null,
    insumo: c.insumo ?? c.nombre ?? c.name ?? c.product ?? '',
    qtyPorUnidad: Number(c.qtyPorUnidad ?? c.qty ?? c.cantidad ?? 0),
  }));
}