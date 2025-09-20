// src/services/prices.service.js
import { http } from '../lib/http';

function normList(x) {
  return {
    id: x.id ?? x._id ?? null,
    name: x.name ?? x.nombre ?? x.listName ?? '',
    currency: x.currency ?? x.moneda ?? 'ARS',
    active: x.active ?? x.activa ?? true,
    raw: x,
  };
}

const GET_CANDIDATES = [
  (qs) => `/price-lists/search?${qs}`,
  (qs) => `/price-lists?${qs}`,
  (qs) => `/pricelists/search?${qs}`,
  (qs) => `/pricelists?${qs}`,
  (qs) => `/prices/lists?${qs}`,
];

const POST_CANDIDATES = ['/price-lists', '/pricelists', '/prices/lists'];
const PUT_CANDIDATES  = (id) => [`/price-lists/${id}`, `/pricelists/${id}`, `/prices/lists/${id}`];
const DEL_CANDIDATES  = (id) => [`/price-lists/${id}`, `/pricelists/${id}`, `/prices/lists/${id}`];

export async function searchPriceLists({ page = 1, limit = 20, sort = 'name', q = '' } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (q) qs.set('q', q);

  for (const builder of GET_CANDIDATES) {
    try {
      const { data } = await http.get(builder(qs.toString()));
      const arr = Array.isArray(data?.items) ? data.items
                : Array.isArray(data?.data)   ? data.data
                : Array.isArray(data)         ? data
                : [];
      return {
        items: arr.map(normList),
        page: data?.page ?? page,
        pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
        total: data?.total,
      };
    } catch (_) {}
  }
  return { items: [], page, pages: 1, total: 0 };
}

export async function createPriceList(payload) {
  for (const p of POST_CANDIDATES) {
    try {
      const { data } = await http.post(p, payload);
      return data;
    } catch (_) {}
  }
  throw new Error('POST price-list no disponible');
}

export async function updatePriceList(id, payload) {
  for (const p of PUT_CANDIDATES(id)) {
    try {
      const { data } = await http.patch(p, payload);
      return data;
    } catch (_) {
      try {
        const { data } = await http.put(p, payload);
        return data;
      } catch (_) {}
    }
  }
  throw new Error('UPDATE price-list no disponible');
}

export async function deletePriceList(id) {
  for (const p of DEL_CANDIDATES(id)) {
    try {
      const { data } = await http.delete(p);
      return data ?? { ok: true };
    } catch (_) {}
  }
  throw new Error('DELETE price-list no disponible');
}