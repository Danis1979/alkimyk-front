// src/services/clients.service.js
import { http } from '../lib/http';

// === Local fallback (si el backend 404) ===
const LS_KEY = 'clients.local';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveLocal(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }

function norm(c) {
  // normalizamos distintas variantes de campos
  return {
    id: c.id ?? c.clientId ?? c._id ?? null,
    nombre: c.nombre ?? c.name ?? c.razonSocial ?? '',
    cuit: c.cuit ?? c.taxId ?? '',
    direccion: c.direccion ?? c.address ?? '',
    condicionesPago: c.condicionesPago ?? c.paymentTerms ?? '',
    listasPrecio: c.listasPrecio ?? c.priceLists ?? '',
    email: c.email ?? '',
    telefono: c.telefono ?? c.phone ?? '',
    activo: c.activo ?? c.active ?? true,
    _raw: c,
  };
}

// Intenta varios endpoints comunes; si 404, lanza
async function getJSON(url) {
  const { data } = await http.get(url);
  return data;
}

// Lista con paginado/búsqueda
export async function listClients({ page = 1, limit = 20, q = '', sort = 'nombre' } = {}) {
  // 1) Backend ideal
  try {
    // Probar formas típicas
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) qs.set('q', q);
    if (sort) qs.set('sort', sort);

    let data;
    try { data = await getJSON(`/clients/search?${qs.toString()}`); }
    catch (e1) {
      try { data = await getJSON(`/clients?${qs.toString()}`); }
      catch (e2) { throw e2; }
    }

    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    const total = data?.total ?? items.length;
    const pages = data?.pages ?? Math.max(1, Math.ceil(total / limit));
    return { items: items.map(norm), total, page: data?.page ?? page, pages };
  } catch {
    // 2) Fallback LOCAL (sin backend)
    const all = loadLocal();
    const f = q
      ? all.filter(c =>
          (c.nombre || '').toLowerCase().includes(q.toLowerCase()) ||
          (c.cuit || '').toLowerCase().includes(q.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(q.toLowerCase())
        )
      : all;
    // orden simple por nombre
    f.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    const start = (page - 1) * limit;
    const items = f.slice(start, start + limit);
    const total = f.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    return { items, total, page, pages };
  }
}

export async function getClientById(id) {
  // Backend
  try {
    const data = await getJSON(`/clients/${id}`);
    return norm(data);
  } catch {
    // Local
    const all = loadLocal();
    const found = all.find(c => String(c.id) === String(id));
    return found ?? null;
  }
}

export async function createClient(payload) {
  const body = {
    nombre: payload.nombre?.trim() || '',
    cuit: payload.cuit?.trim() || '',
    direccion: payload.direccion?.trim() || '',
    condicionesPago: payload.condicionesPago?.trim() || '',
    listasPrecio: payload.listasPrecio?.trim() || '',
    email: payload.email?.trim() || '',
    telefono: payload.telefono?.trim() || '',
    activo: payload.activo ?? true,
  };

  // Backend
  try {
    const { data } = await http.post('/clients', body);
    return norm(data);
  } catch {
    // Local
    const all = loadLocal();
    const id = Date.now(); // id temporal
    const obj = norm({ id, ...body });
    all.push(obj);
    saveLocal(all);
    return obj;
  }
}

export async function updateClient(id, payload) {
  const body = {
    nombre: payload.nombre?.trim() || '',
    cuit: payload.cuit?.trim() || '',
    direccion: payload.direccion?.trim() || '',
    condicionesPago: payload.condicionesPago?.trim() || '',
    listasPrecio: payload.listasPrecio?.trim() || '',
    email: payload.email?.trim() || '',
    telefono: payload.telefono?.trim() || '',
    activo: payload.activo ?? true,
  };

  // Backend
  try {
    const { data } = await http.put(`/clients/${id}`, body);
    return norm(data);
  } catch {
    // Local
    const all = loadLocal();
    const idx = all.findIndex(c => String(c.id) === String(id));
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...body };
      saveLocal(all);
      return all[idx];
    }
    return null;
  }
}

export async function removeClient(id) {
  // Backend
  try {
    await http.delete(`/clients/${id}`);
    return true;
  } catch {
    // Local
    const all = loadLocal().filter(c => String(c.id) !== String(id));
    saveLocal(all);
    return true;
  }
}