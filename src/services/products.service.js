// src/services/products.service.js
import { http } from '../lib/http';

// Normalizador de filas
function normProduct(p) {
  return {
    id: p.id,
    name: p.name ?? p.nombre ?? p.product ?? '',
    sku: p.sku ?? p.codigo ?? '',
    uom: p.uom ?? p.unidad ?? '',
    tipo: p.tipo ?? p.type ?? 'simple',
    costoStd: p.costoStd ?? p.costo ?? 0,
    precioLista: p.precioLista ?? p.price ?? 0,
    activo: (p.activo ?? p.active ?? true) ? true : false,
    raw: p,
  };
}

// Devuelve siempre {items, page, pages, total}
export async function searchProducts({ q = '', page = 1, limit = 20, sort } = {}) {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  if (sort) qs.set('sort', sort);

  // orden de prueba de endpoints posibles
  const candidates = [
    `/products/search?${qs.toString()}`,
    `/products?${qs.toString()}`,
    `/products/list?${qs.toString()}`
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
      if (arr) {
        return {
          items: arr.map(normProduct),
          page: data?.page ?? page,
          pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
          total: data?.total,
        };
      }
    } catch (_) {}
  }
  return { items: [], page, pages: undefined, total: undefined };
}

export async function createProduct(payload) {
  // payload esperado (mínimo): { name, sku?, uom?, tipo?, costoStd?, precioLista?, activo? }
  const { data } = await http.post('/products', payload);
  return data;
}