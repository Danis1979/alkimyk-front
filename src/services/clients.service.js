// src/services/clients.service.js
import { http } from '../lib/http';

// Normaliza diferentes formas de respuesta
function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.items)) return x.items;
  if (x && Array.isArray(x.data)) return x.data;
  if (x && Array.isArray(x.results)) return x.results;
  return [];
}
function normClient(c) {
  return {
    id: c.id ?? c.clientId ?? c._id ?? null,
    label: c.name ?? c.nombre ?? c.client ?? c.razonSocial ?? c.razon ?? c.title ?? '',
    raw: c,
  };
}

const CANDIDATES = [
  { path: '/clients/search', qKey: 'q' },
  { path: '/clients',        qKey: 'q' },
  { path: '/clients',        qKey: 'search' },
  { path: '/clients/list',   qKey: 'q' },
  { path: '/clients/find',   qKey: 'q' },
  { path: '/clients/autocomplete', qKey: 'q' },
];

export async function searchClients({ q = '', limit = 5 } = {}) {
  for (const { path, qKey } of CANDIDATES) {
    try {
      const qs = new URLSearchParams();
      if (q) qs.set(qKey, q);
      if (limit) qs.set('limit', String(limit));
      const url = `${path}${qs.toString() ? `?${qs}` : ''}`;
      const { data } = await http.get(url);
      const arr = toArray(data).map(normClient).filter(c => c.label);
      if (arr.length) return arr;
    } catch (_) { /* probamos la siguiente variante */ }
  }
  return []; // sin datos => el Typeahead deja escribir libre
}