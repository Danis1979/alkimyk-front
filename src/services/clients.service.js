// src/services/clients.service.js
import { http } from '../lib/http';

// Normaliza al modelo canónico
export function normalizeClient(c = {}) {
  return {
    id: c.id,
    nombre: c.nombre ?? c.name ?? c.razonSocial ?? '',
    cuit: c.cuit ?? c.taxId ?? '',
    direccion: c.direccion ?? c.address ?? '',
    condicionesPago: c.condicionesPago ?? c.paymentTerms ?? '',
    listasPrecio: Array.isArray(c.listasPrecio)
      ? c.listasPrecio
      : (typeof c.listasPrecio === 'string'
          ? c.listasPrecio.split(',').map(s => s.trim()).filter(Boolean)
          : []),
    email: c.email ?? '',
    telefono: c.telefono ?? c.phone ?? '',
    activo: c.activo ?? c.active ?? true,
    _raw: c,
  };
}

function toPayload(x = {}) {
  return {
    id: x.id,
    nombre: x.nombre?.trim() || null,
    cuit: x.cuit?.trim() || null,
    direccion: x.direccion?.trim() || null,
    condicionesPago: x.condicionesPago?.trim() || null,
    listasPrecio: Array.isArray(x.listasPrecio)
      ? x.listasPrecio
      : (x.listasPrecio?.split?.(',').map(s => s.trim()).filter(Boolean) ?? []),
    email: x.email?.trim() || null,
    telefono: x.telefono?.trim() || null,
    activo: !!x.activo,
  };
}

export async function searchClients({ page = 1, limit = 20, q = '', sort = 'nombre' } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  // Preferente: /clients/search
  try {
    const { data } = await http.get(`/clients/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const total = data?.total ?? undefined;
    const pages = data?.pages ?? (total ? Math.max(1, Math.ceil(total / limit)) : undefined);
    return { items: items.map(normalizeClient), page: data?.page ?? page, pages, total };
  } catch {}

  // Fallback: /clients
  try {
    const { data } = await http.get(`/clients?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const total = data?.total ?? undefined;
    const pages = data?.pages ?? (total ? Math.max(1, Math.ceil(total / limit)) : undefined);
    return { items: arr.map(normalizeClient), page, pages, total };
  } catch {
    return { items: [], page, pages: 1, total: 0 };
  }
}

export async function createClient(form) {
  const payload = toPayload(form);
  const { data } = await http.post('/clients', payload);
  return normalizeClient(data ?? payload);
}

export async function updateClient(id, form) {
  const payload = toPayload({ ...form, id });
  try {
    const { data } = await http.put(`/clients/${id}`, payload);
    return normalizeClient(data ?? payload);
  } catch {
    const { data } = await http.patch(`/clients/${id}`, payload);
    return normalizeClient(data ?? payload);
  }
}

export async function deleteClient(id) {
  await http.delete(`/clients/${id}`);
  return true;
}