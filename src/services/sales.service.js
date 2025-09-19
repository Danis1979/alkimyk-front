// src/services/sales.service.js
import { http } from '../lib/http';

// Normaliza campos posibles del backend: fecha/date, client/cliente, total/subtotal
function normSale(s) {
  return {
    id: s.id,
    fecha: s.fecha ?? s.date ?? null,
    client: s.client ?? s.cliente ?? s.clientName ?? s.customer ?? '',
    total: s.total ?? s.subtotal ?? 0,
    raw: s,
  };
}

function buildQS({ page = 1, limit = 20, sort, from, to, q }) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (from) qs.set('from', from);
  if (to)   qs.set('to', to);
  if (q)    qs.set('q', q);
  return qs;
}

// Mapea el campo de orden según el endpoint (orders usa "date")
function mapSortFor(endpoint, sort) {
  if (!sort) return sort;
  const isDesc = sort.startsWith('-');
  const key = isDesc ? sort.slice(1) : sort;
  let mapped = key;

  if (endpoint === 'orders') {
    if (key === 'fecha') mapped = 'date';
  }
  // para sales dejamos "fecha" tal cual; "total" sirve en ambos

  return isDesc ? `-${mapped}` : mapped;
}

function shapeResult({ data, page, limit }) {
  // data puede ser {items, total, pages, page} o un array plano
  const itemsRaw = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  const items = itemsRaw.map(normSale);

  const total = (typeof data?.total === 'number') ? data.total
               : (Array.isArray(data) ? data.length : undefined);

  const pages = (typeof data?.pages === 'number') ? data.pages
               : (typeof total === 'number' ? Math.max(1, Math.ceil(total / limit)) : undefined);

  const hasNext = (typeof pages === 'number') ? (page < pages) : (items.length === limit);

  return {
    items,
    page: data?.page ?? page,
    pages,
    total,
    hasNext,
  };
}

// Principal: intenta /sales/search y cae a /orders/search
export async function searchSales({ page = 1, limit = 20, sort = '-fecha', from, to, q } = {}) {
  // 1) /sales/search
  try {
    const qs = buildQS({ page, limit, sort: mapSortFor('sales', sort), from, to, q });
    const { data } = await http.get(`/sales/search?${qs.toString()}`);
    return shapeResult({ data, page, limit });
  } catch (_) {
    // sigue al fallback
  }

  // 2) Fallback: /orders/search (usa "date" en sort)
  const qs2 = buildQS({ page, limit, sort: mapSortFor('orders', sort), from, to, q });
  const { data } = await http.get(`/orders/search?${qs2.toString()}`);
  return shapeResult({ data, page, limit });
}

// Alias por compatibilidad con componentes que importen fetchSales
export async function fetchSales(args) {
  return searchSales(args);
}

// Detalle: intenta /sales/:id[/full] y cae a /orders/:id
export async function fetchSaleById(id) {
  const urls = [`/sales/${id}/full`, `/sales/${id}`];
  for (const u of urls) {
    try {
      const { data } = await http.get(u);
      return data;
    } catch (_) {}
  }
  // Fallback a orders
  const ordersUrls = [`/orders/${id}/full`, `/orders/${id}`];
  for (const u of ordersUrls) {
    try {
      const { data } = await http.get(u);
      return data;
    } catch (_) {}
  }
  return { id, items: [] };
}

export async function createSale(payload) {
  const { data } = await http.post('/sales', payload);
  return data;
}