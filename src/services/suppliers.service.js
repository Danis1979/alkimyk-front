// src/services/suppliers.service.js
import { http } from '../lib/http';

function normSupplier(s) {
  return {
    id: s.id,
    nombre: s.nombre ?? s.name ?? s.supplier ?? s.proveedor ?? '',
    cuit: s.cuit ?? s.taxId ?? '',
    direccion: s.direccion ?? s.address ?? '',
    email: s.email ?? '',
    telefono: s.telefono ?? s.phone ?? '',
    raw: s,
  };
}

export async function searchSuppliers({ q = '', page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));

  // Variantes comunes: suppliers / providers
  const candidates = [
    `/suppliers/search?${qs.toString()}`,
    `/suppliers?${qs.toString()}`,
    `/suppliers/list?${qs.toString()}`,
    `/providers/search?${qs.toString()}`,
    `/providers?${qs.toString()}`
  ];

  for (const url of candidates) {
    try {
      const { data } = await http.get(url);
      const arr = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      if (arr) return { items: arr.map(normSupplier), page, pages: undefined, total: undefined };
    } catch (_) {}
  }
  return { items: [], page, pages: undefined, total: undefined };
}

export async function createSupplier(payload) {
  // payload mínimo: { nombre, cuit?, direccion?, email?, telefono? }
  const { data } = await http.post('/suppliers', payload);
  return data;
}