// src/services/uom.service.js
import { http } from '../lib/http';

// Normaliza distintos formatos comunes
function normUom(u) {
  return {
    id: u.id ?? u._id ?? u.code ?? u.codigo ?? null,
    code: u.code ?? u.codigo ?? u.key ?? u.simbolo ?? '',
    name: u.name ?? u.nombre ?? u.descripcion ?? '',
    active: u.active ?? u.activo ?? true,
    raw: u,
  };
}

const GET_CANDIDATES = [
  (qs) => `/uom/search?${qs}`,
  (qs) => `/uom?${qs}`,
  (qs) => `/units/search?${qs}`,
  (qs) => `/units?${qs}`,
];

const POST_CANDIDATES = ['/uom', '/units'];
const PUT_CANDIDATES  = (id) => [`/uom/${id}`, `/units/${id}`];
const DEL_CANDIDATES  = (id) => [`/uom/${id}`, `/units/${id}`];

export async function searchUom({ page = 1, limit = 20, sort = 'code', q = '' } = {}) {
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
        items: arr.map(normUom),
        page: data?.page ?? page,
        pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(data.total / limit)) : undefined),
        total: data?.total,
      };
    } catch (_) { /* try next */ }
  }
  return { items: [], page, pages: 1, total: 0 };
}

export async function createUom(payload) {
  // payload esperado: { code, name, active }
  for (const p of POST_CANDIDATES) {
    try {
      const { data } = await http.post(p, payload);
      return data;
    } catch (_) {}
  }
  throw new Error('POST UoM no disponible');
}

export async function updateUom(id, payload) {
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
  throw new Error('UPDATE UoM no disponible');
}

export async function deleteUom(id) {
  for (const p of DEL_CANDIDATES(id)) {
    try {
      const { data } = await http.delete(p);
      return data ?? { ok: true };
    } catch (_) {}
  }
  throw new Error('DELETE UoM no disponible');
}