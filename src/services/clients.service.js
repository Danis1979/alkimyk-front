import { http } from '../lib/http';

// Normaliza "listasPrecio" en un array de {id, name}
function normLists(v) {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map(x => {
      if (typeof x === 'number') return { id: x, name: String(x) };
      if (typeof x === 'string') return { id: null, name: x };
      return { id: x.id ?? null, name: x.name ?? x.nombre ?? String(x.id ?? '') };
    });
  }
  if (typeof v === 'string') {
    return v.split(',').map(s => ({ id: null, name: s.trim() })).filter(x => x.name);
  }
  return [];
}

function normClient(x) {
  return {
    id: x.id ?? x.ID ?? null,
    nombre: x.nombre ?? x.name ?? x.client ?? '',
    cuit: x.cuit ?? x.taxId ?? '',
    direccion: x.direccion ?? x.address ?? '',
    condicionesPago: x.condicionesPago ?? x.paymentTerms ?? '',
    listasPrecio: normLists(x.listasPrecio ?? x.priceLists ?? x.listas),
    email: x.email ?? '',
    telefono: x.telefono ?? x.phone ?? '',
    raw: x,
  };
}

const BASES = ['/clients', '/customers', '/clientes'];

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

export async function searchClients({ page = 1, limit = 20, q = '', sort } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  // 1) /search
  let r = await tryGet(`/search?${qs.toString()}`);
  if (r.ok) {
    const arr = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    return {
      items: arr.map(normClient),
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
      items: slice.map(normClient),
      page,
      total: arr.length,
      pages: Math.max(1, Math.ceil(arr.length / limit)),
      _base: r.base,
    };
  }

  return { items: [], page, total: 0, pages: 1, _base: null };
}

export async function createClient(payload) {
  const body = {
    nombre: payload.nombre?.trim() || '',
    cuit: payload.cuit || '',
    direccion: payload.direccion || '',
    condicionesPago: payload.condicionesPago || '',
    // Enviamos solo IDs si existen; si no, enviamos nombres
    listasPrecio: (payload.listasPrecio || []).map(x => (x.id ?? x.name)).filter(Boolean),
    email: payload.email || '',
    telefono: payload.telefono || '',
  };
  const r = await tryPost('', body);
  if (!r.ok) throw r.err || new Error('No se pudo crear cliente');
  return r.data;
}

export async function updateClient(id, payload) {
  const body = {
    nombre: payload.nombre?.trim() || '',
    cuit: payload.cuit || '',
    direccion: payload.direccion || '',
    condicionesPago: payload.condicionesPago || '',
    listasPrecio: (payload.listasPrecio || []).map(x => (x.id ?? x.name)).filter(Boolean),
    email: payload.email || '',
    telefono: payload.telefono || '',
  };
  const r = await tryPut(id, body);
  if (!r.ok) throw r.err || new Error('No se pudo actualizar cliente');
  return r.data;
}

export async function deleteClient(id) {
  const r = await tryDelete(id);
  if (!r.ok) throw r.err || new Error('No se pudo eliminar cliente');
  return r.data;
}