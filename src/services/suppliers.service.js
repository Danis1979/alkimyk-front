// src/services/suppliers.service.js
import { http } from '../lib/http';

// Normaliza a nuestro shape
function normSupplier(s = {}) {
  const id =
    s.id ??
    s.supplierId ??
    s._id ??
    null;

  const nombre =
    s.nombre ??
    s.name ??
    s.razonSocial ??
    '';

  const cuit =
    s.cuit ??
    s.taxId ??
    '';

  const direccion =
    s.direccion ??
    s.address ??
    '';

  const email =
    s.email ??
    s.mail ??
    '';

  const telefono =
    s.telefono ??
    s.phone ??
    s.tel ??
    '';

  return { id, nombre, cuit, direccion, email, telefono, raw: s };
}

// Payload al contrato del backend (ES)
function toBackendPayload(s = {}) {
  return {
    id: s.id,
    nombre: s.nombre ?? '',
    cuit: s.cuit ?? '',
    direccion: s.direccion ?? '',
    email: s.email ?? '',
    telefono: s.telefono ?? '',
  };
}

// Búsqueda + paginado (tolerante a formatos)
export async function searchSuppliers({ page = 1, limit = 20, sort = 'nombre', q } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (q) qs.set('q', q);

  // Preferido: /suppliers/search
  try {
    const { data } = await http.get(`/suppliers/search?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return {
      items: arr.map(normSupplier),
      page:  data?.page  ?? page,
      pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(Number(data.total) / limit)) : undefined),
      total: data?.total,
      meta:  data?.meta,
    };
  } catch (_) { /* fallback */ }

  // Fallback: /suppliers (puede ser array directo)
  try {
    const { data } = await http.get(`/suppliers?${qs.toString()}`);
    const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return {
      items: arr.map(normSupplier),
      page,
      pages: arr.length === limit ? page + 1 : page, // heurística
      total: Array.isArray(data?.items) ? Number(data?.total ?? arr.length) : arr.length,
      meta: data?.meta,
    };
  } catch (e) {
    return { items: [], page, pages: 1, total: 0, error: e?.message ?? 'No disponible' };
  }
}

export async function getSupplierById(id) {
  const urls = [`/suppliers/${id}`, `/suppliers/${id}/full`];
  for (const u of urls) {
    try {
      const { data } = await http.get(u);
      return normSupplier(data);
    } catch (_) {}
  }
  return normSupplier({ id });
}

export async function createSupplier(patch) {
  const payload = toBackendPayload(patch);
  const { data } = await http.post('/suppliers', payload);
  return normSupplier(data ?? payload);
}

export async function updateSupplier(id, patch) {
  const payload = toBackendPayload({ ...patch, id });
  try {
    const { data } = await http.patch(`/suppliers/${id}`, payload);
    return normSupplier(data ?? payload);
  } catch (_) {
    const { data } = await http.put(`/suppliers/${id}`, payload);
    return normSupplier(data ?? payload);
  }
}

export async function deleteSupplier(id) {
  await http.delete(`/suppliers/${id}`);
  return { ok: true };
}