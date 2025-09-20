// src/services/clients.service.js
import { http } from '../lib/http';

// Normaliza distintas formas del backend al modelo del front
function normClient(c = {}) {
  return {
    id: c.id,
    nombre: c.nombre ?? c.name ?? '',
    cuit: c.cuit ?? c.taxId ?? c.cuil ?? '',
    direccion: c.direccion ?? c.address ?? '',
    condicionesPago: c.condicionesPago ?? c.paymentTerms ?? '',
    listasPrecio: c.listasPrecio ?? c.priceLists ?? '',
    email: c.email ?? '',
    telefono: c.telefono ?? c.phone ?? '',
    raw: c,
  };
}

// Extrae lista de distintas formas {items}|{data}|{results}|array
function pickList(x) {
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.results)) return x.results;
  if (Array.isArray(x)) return x;
  return [];
}

export async function searchClients({ page = 1, limit = 20, sort = 'nombre', q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (q) qs.set('q', q);

  // Probamos varias rutas típicas sin romper si alguna 404
  const tryUrls = [
    `/clients/search?${qs.toString()}`,
    `/clients?${qs.toString()}`,
    `/clients/list?${qs.toString()}`,
  ];

  for (const url of tryUrls) {
    try {
      const { data } = await http.get(url);
      const arr = pickList(data);
      return {
        items: arr.map(normClient),
        page: data?.page ?? page,
        pages:
          data?.pages ??
          (typeof data?.total === 'number' ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
        total: data?.total,
      };
    } catch (_) {
      // seguimos probando siguiente forma
    }
  }
  // Fallback vacío para que el UI no crashee
  return { items: [], page, pages: 1, total: 0 };
}

export async function createClient(payload) {
  const body = {
    ...payload,
    nombre: payload?.nombre ?? payload?.name ?? '',
    // compatibilidad si el backend espera "name"
    name: payload?.nombre ?? payload?.name ?? '',
  };
  const attempts = [
    () => http.post('/clients', body),
    () => http.post('/clients/new', body),
  ];
  for (const call of attempts) {
    try {
      const { data } = await call();
      return data;
    } catch (_) {}
  }
  throw new Error('createClient failed');
}

export async function updateClient(id, payload) {
  const body = {
    ...payload,
    nombre: payload?.nombre ?? payload?.name ?? '',
    name: payload?.nombre ?? payload?.name ?? '',
  };
  const attempts = [
    () => http.patch(`/clients/${id}`, body),
    () => http.put(`/clients/${id}`, body),
  ];
  for (const call of attempts) {
    try {
      const { data } = await call();
      return data;
    } catch (_) {}
  }
  throw new Error('updateClient failed');
}

export async function deleteClient(id) {
  const attempts = [
    () => http.delete(`/clients/${id}`),
    () => http.post(`/clients/${id}/delete`),
  ];
  for (const call of attempts) {
    try {
      const { data } = await call();
      return data ?? true;
    } catch (_) {}
  }
  throw new Error('deleteClient failed');
}