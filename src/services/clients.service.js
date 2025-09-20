// src/services/clients.service.js
import { http } from '../lib/http';

// --- Normalizadores ---------------------------------------------------------

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
    return v
      .split(',')
      .map(s => ({ id: null, name: s.trim() }))
      .filter(x => x.name);
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

// --- Endpoints base tolerantes (es/pt/en) -----------------------------------

const BASES = ['/clients', '/customers', '/clientes'];

// GET con prueba de múltiples bases
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

// POST con prueba de múltiples bases
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

// PUT con prueba de múltiples bases
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

// DELETE con prueba de múltiples bases
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

// --- Búsqueda / listado -----------------------------------------------------

export async function searchClients({ page = 1, limit = 20, q = '', sort } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  // 1) Preferimos /search
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

  // 2) Fallback a listado plano
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

// --- CRUD -------------------------------------------------------------------

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

// --- Extras para integración con Ventas (SalesNew) --------------------------

// Trae un cliente por ID (intenta varias bases) y lo normaliza
export async function fetchClientById(id) {
  if (id == null) return null;
  const r = await tryGet(`/${id}`);
  if (!r.ok || !r.data) return null;
  // Algunos backends devuelven {id,...}, otros {data:{...}}
  const obj = (r.data && typeof r.data === 'object' && !Array.isArray(r.data) && r.data.id != null)
    ? r.data
    : r.data?.data ?? r.data;
  return normClient(obj);
}

// Deduce la lista de precios del cliente (acepta normalizado o crudo)
export function deriveClientPriceList(cli) {
  if (!cli) return null;

  // Preferir campos explícitos en crudo si existen
  const raw = cli.raw ?? cli;

  const idRaw =
    raw.priceListId ??
    raw.listaPrecioId ??
    raw.listaId ??
    null;

  const labelRaw =
    raw.priceList?.name ??
    raw.listaPrecio?.nombre ??
    raw.listaPrecio?.name ??
    raw.listaPrecio ??
    raw.priceList ??
    null;

  if (idRaw || labelRaw) {
    return { id: idRaw ?? null, label: labelRaw ?? '' };
  }

  // Sino, usar normalizado
  const listas = Array.isArray(cli.listasPrecio) ? cli.listasPrecio : [];
  if (listas.length) {
    // Si alguna viene marcada como activa en el crudo, usar esa
    const arrRaw = raw.listasPrecio || raw.priceLists || raw.listas || [];
    if (Array.isArray(arrRaw) && arrRaw.length) {
      const active = arrRaw.find(x => x?.activa);
      if (active) {
        return { id: active.id ?? null, label: active.nombre ?? active.name ?? '' };
      }
    }
    // Fallback: primera
    const first = listas[0];
    return { id: first.id ?? null, label: first.name ?? '' };
  }

  return null;
}