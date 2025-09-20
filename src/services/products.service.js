// src/services/products.service.js
import { http } from '../lib/http';

function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.items)) return x.items;
  if (x && Array.isArray(x.data)) return x.data;
  if (x && Array.isArray(x.results)) return x.results;
  return [];
}
function normProduct(p) {
  return {
    id: p.id ?? p.productId ?? p._id ?? null,
    label: p.name ?? p.nombre ?? p.product ?? p.title ?? p.sku ?? '',
    sku: p.sku ?? p.codigo ?? p.code ?? null,
    price: p.price ?? p.precio ?? p.precioLista ?? p.listPrice ?? 0,
    raw: p,
  };
}

const CANDIDATES = [
  { path: '/products/search', qKey: 'q' },
  { path: '/products',        qKey: 'q' },
  { path: '/products',        qKey: 'search' },
  { path: '/products/list',   qKey: 'q' },
  { path: '/products/find',   qKey: 'q' },
  { path: '/products/autocomplete', qKey: 'q' },
];

export async function searchProducts({ q = '', limit = 5 } = {}) {
  for (const { path, qKey } of CANDIDATES) {
    try {
      const qs = new URLSearchParams();
      if (q) qs.set(qKey, q);
      if (limit) qs.set('limit', String(limit));
      const url = `${path}${qs.toString() ? `?${qs}` : ''}`;
      const { data } = await http.get(url);
      const arr = toArray(data).map(normProduct).filter(p => p.label);
      if (arr.length) return arr;
    } catch (_) { /* siguiente variante */ }
  }
  return [];
}