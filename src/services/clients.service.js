// src/services/clients.service.js
import { http } from '../lib/http';

// --- Normalizadores ---------------------------------------------------------
function normLists(v) {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map((x) => {
      if (typeof x === 'number') return { id: x, name: String(x) };
      if (typeof x === 'string') return { id: null, name: x };
      return {
        id: x.id ?? x.ID ?? null,
        name: x.name ?? x.nombre ?? String(x.id ?? ''),
      };
    });
  }
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => ({ id: null, name: s.trim() }))
      .filter((x) => x.name);
  }
  return [];
}

function normClient(x) {
  if (!x || typeof x !== 'object') return null;
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

// --- Helpers HTTP con bases alternativas -----------------------------------
const BASES = ['/clients', '/customers', '/clientes'];

async function tryGet(path) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.get(`${b}${path}`);
      return { ok: true, data, base: b };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, err: lastErr };
}

async function tryPost(path, payload) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.post(`${b}${path}`, payload);
      return { ok: true, data, base: b };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, err: lastErr };
}

async function tryPut(id, payload) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.put(`${b}/${id}`, payload);
      return { ok: true, data, base: b };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, err: lastErr };
}

async function tryDelete(id) {
  let lastErr;
  for (const b of BASES) {
    try {
      const { data } = await http.delete(`${b}/${id}`);
      return { ok: true, data, base: b };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, err: lastErr };
}

// --- Listado / búsqueda -----------------------------------------------------
export async function searchClients({ page = 1, limit = 20, q = '', sort } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  // 1) Endpoint paginado /search
  let r = await tryGet(`/search?${qs.toString()}`);
  if (r.ok) {
    const arr = Array.isArray(r.data?.items)
      ? r.data.items
      : Array.isArray(r.data)
      ? r.data
      : [];
    return {
      items: arr.map(normClient).filter(Boolean),
      page: r.data?.page ?? page,
      total: r.data?.total,
      pages: r.data?.pages,
      _base: r.base,
    };
  }

  // 2) Listado plano sin paginar
  r = await tryGet('');
  if (r.ok) {
    const arr = Array.isArray(r.data?.items)
      ? r.data.items
      : Array.isArray(r.data)
      ? r.data
      : [];
    // Paginado en cliente
    const start = (page - 1) * limit;
    const slice = arr.slice(start, start + limit);
    return {
      items: slice.map(normClient).filter(Boolean),
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
    nombre: (payload.nombre ?? '').trim(),
    cuit: payload.cuit ?? '',
    direccion: payload.direccion ?? '',
    condicionesPago: payload.condicionesPago ?? '',
    // Enviar IDs si existen, o nombre en su defecto
    listasPrecio: (payload.listasPrecio ?? [])
      .map((x) => x?.id ?? x?.name)
      .filter(Boolean),
    email: payload.email ?? '',
    telefono: payload.telefono ?? '',
  };
  const r = await tryPost('', body);
  if (!r.ok) throw r.err || new Error('No se pudo crear cliente');
  return r.data;
}

export async function updateClient(id, payload) {
  const body = {
    nombre: (payload.nombre ?? '').trim(),
    cuit: payload.cuit ?? '',
    direccion: payload.direccion ?? '',
    condicionesPago: payload.condicionesPago ?? '',
    listasPrecio: (payload.listasPrecio ?? [])
      .map((x) => x?.id ?? x?.name)
      .filter(Boolean),
    email: payload.email ?? '',
    telefono: payload.telefono ?? '',
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

// --- Lectura por ID (lo que pide SalesNew.jsx) ------------------------------
export async function fetchClientById(id) {
  const idn = Number(id);
  // Intentos directos por cada base
  for (const b of BASES) {
    try {
      const { data } = await http.get(`${b}/${idn}`);
      // A veces viene como {id,...} o como {item:{...}} o {items:[...]}
      const cand =
        (data && data.item) ||
        (Array.isArray(data?.items) && data.items[0]) ||
        data;
      const n = normClient(cand);
      if (n) return n;
    } catch (_) {}
  }
  return null;
}

// --- Derivar lista de precios preferida del cliente -------------------------
export function deriveClientPriceList(client) {
  // Devolvemos el primer elemento de listasPrecio ya normalizado
  // o null si no hay
  const arr = Array.isArray(client?.listasPrecio) ? client.listasPrecio : [];
  if (!arr.length) return null;

  // Retornar un identificador usable por el resolver de precios:
  // si hay id -> id; si no -> name
  const first = arr[0];
  return first.id ?? first.name ?? null;
}