// src/services/suppliers.service.js
import { http } from '../lib/http';

export function normalizeSupplier(s = {}) {
  return {
    id: s.id,
    nombre: s.nombre ?? s.name ?? s.razonSocial ?? '',
    cuit: s.cuit ?? s.taxId ?? '',
    direccion: s.direccion ?? s.address ?? '',
    email: s.email ?? '',
    telefono: s.telefono ?? s.phone ?? '',
    activo: s.activo ?? s.active ?? true,
    _raw: s,
  };
}

function toPayload(x = {}) {
  return {
    id: x.id,
    nombre: x.nombre?.trim() || null,
    cuit: x.cuit?.trim() || null,
    direccion: x.direccion?.trim() || null,
    email: x.email?.trim() || null,
    telefono: x.telefono?.trim() || null,
    activo: !!x.activo,
  };
}

export async function searchSuppliers({ page = 1, limit = 20, q = '', sort = 'nombre' } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set('q', q);
  if (sort) qs.set('sort', sort);

  try {
    const { data } = await http.get(`/suppliers/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const total = data?.total ?? undefined;
    const pages = data?.pages ?? (total ? Math.max(1, Math.ceil(total / limit)) : undefined);
    return { items: items.map(normalizeSupplier), page: data?.page ?? page, pages, total };
  } catch {}

  try {
    const { data } = await http.get(`/suppliers?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const total = data?.total ?? undefined;
    const pages = data?.pages ?? (total ? Math.max(1, Math.ceil(total / limit)) : undefined);
    return { items: arr.map(normalizeSupplier), page, pages, total };
  } catch {
    return { items: [], page, pages: 1, total: 0 };
  }
}

export async function createSupplier(form) {
  const payload = toPayload(form);
  const { data } = await http.post('/suppliers', payload);
  return normalizeSupplier(data ?? payload);
}

export async function updateSupplier(id, form) {
  const payload = toPayload({ ...form, id });
  try {
    const { data } = await http.put(`/suppliers/${id}`, payload);
    return normalizeSupplier(data ?? payload);
  } catch {
    const { data } = await http.patch(`/suppliers/${id}`, payload);
    return normalizeSupplier(data ?? payload);
  }
}

export async function deleteSupplier(id) {
  await http.delete(`/suppliers/${id}`);
  return true;
}