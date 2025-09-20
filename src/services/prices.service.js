// src/services/prices.service.js
import { http } from '../lib/http';

function normList(x) {
  return {
    id: x.id ?? x.ID ?? null,
    name: x.name ?? x.nombre ?? x.title ?? '',
    currency: x.currency ?? x.moneda ?? 'ARS',
    activo: (x.activo ?? x.active ?? x.enabled ?? true) ? true : false,
    // opcional: factor, version, notas
    factor: x.factor ?? null,
    notes: x.notes ?? x.notas ?? '',
    raw: x,
  };
}

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

async function tryPut(id, payload) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.put(`${b}/${id}`, payload);
      return { ok: true, data, base: b };
    } catch (e) { lastErr = e; }
  }
  return { ok: false, err: lastErr };
}

async function tryDelete(id) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.delete(`${b}/${id}`);
      return { ok: true, data, base: b };
    } catch (e) { lastErr = e; }
  }
  return { ok: false, err: lastErr };
}

export async function searchPriceLists({ page = 1, limit = 20, q = '', sort } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

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
  const r = await tryPut(id, body);
  if (!r.ok) throw r.err || new Error('No se pudo actualizar la lista');
  return r.data;
}

export async function deletePriceList(id) {
  const r = await tryDelete(id);
  if (!r.ok) throw r.err || new Error('No se pudo eliminar la lista');
  return r.data;
}