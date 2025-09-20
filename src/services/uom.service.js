// src/services/uom.service.js
import { http } from '../lib/http';

function normUom(x) {
  return {
    id: x.id ?? x.ID ?? null,
    code: x.code ?? x.codigo ?? x.abbrev ?? x.sigla ?? '',
    name: x.name ?? x.nombre ?? x.title ?? '',
    activo: (x.activo ?? x.active ?? x.enabled ?? true) ? true : false,
    raw: x,
  };
}

const BASES = ['/uom', '/units', '/measures'];

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

export async function searchUom({ page = 1, limit = 20, q = '', sort } = {}) {
  // 1) Endpoints /search
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  let r = await tryGet(`/search?${qs.toString()}`);
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    return {
      items: arr.map(normUom),
      page: r.data?.page ?? page,
      total: r.data?.total,
      pages: r.data?.pages,
      _base: r.base,
    };
  }

  // 2) Fallback GET lista simple
  r = await tryGet('');
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    // paginado client-side si vino todo
    const start = (page - 1) * limit;
    const slice = arr.slice(start, start + limit);
    return {
      items: slice.map(normUom),
      page,
      total: arr.length,
      pages: Math.max(1, Math.ceil(arr.length / limit)),
      _base: r.base,
    };
  }

  // 3) Nada
  return { items: [], page, total: 0, pages: 1, _base: null };
}

export async function createUom(payload) {
  // payload normalizado
  const body = {
    code: payload.code?.trim() || '',
    name: payload.name?.trim() || '',
    activo: payload.activo ?? true,
  };
  const r = await tryPost('', body);
  if (!r.ok) throw r.err || new Error('No se pudo crear UoM');
  return r.data;
}

export async function updateUom(id, payload) {
  const body = {
    code: payload.code?.trim() || '',
    name: payload.name?.trim() || '',
    activo: payload.activo ?? true,
  };
  const r = await tryPut(id, body);
  if (!r.ok) throw r.err || new Error('No se pudo actualizar UoM');
  return r.data;
}

export async function deleteUom(id) {
  const r = await tryDelete(id);
  if (!r.ok) throw r.err || new Error('No se pudo eliminar UoM');
  return r.data;
}