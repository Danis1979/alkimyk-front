// src/services/clients.service.js
import { http } from '../lib/http';

function normClient(c) {
  return {
    id: c.id,
    nombre: c.nombre ?? c.name ?? c.client ?? '',
    cuit: c.cuit ?? c.taxId ?? '',
    direccion: c.direccion ?? c.address ?? '',
    condicionesPago: c.condicionesPago ?? c.terms ?? '',
    listasPrecio: c.listasPrecio ?? c.priceList ?? '',
    email: c.email ?? '',
    telefono: c.telefono ?? c.phone ?? '',
    raw: c,
  };
}

export async function searchClients({ q = '', page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));

  // Variantes comunes en backends: clients / customers
  const candidates = [
    `/clients/search?${qs.toString()}`,
    `/clients?${qs.toString()}`,
    `/clients/list?${qs.toString()}`,
    `/clients/autocomplete?${qs.toString()}`,
    `/customers/search?${qs.toString()}`,
    `/customers?${qs.toString()}`
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
      if (arr) return { items: arr.map(normClient), page, pages: undefined, total: undefined };
    } catch (_) {}
  }
  return { items: [], page, pages: undefined, total: undefined };
}

export async function createClient(payload) {
  // payload mínimo: { nombre, cuit?, direccion?, email?, telefono? }
  const { data } = await http.post('/clients', payload);
  return data;
}