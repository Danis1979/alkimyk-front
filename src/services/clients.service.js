import { http } from '../lib/http';
function pickLabel(c) {
  return (
    c?.nombre ??
    c?.name ??
    c?.razonSocial ??
    c?.fullname ??
    (c?.cuit ? `Sin nombre — CUIT ${c.cuit}` : `Cliente #${c?.id ?? ''}`)
  );
}
export async function searchClients(q, { limit = 8, page = 1 } = {}) {
  if (!q || q.trim().length < 2) return [];
  const qs = new URLSearchParams({ q: q.trim(), limit: String(limit), page: String(page) });
  try {
    const { data } = await http.get(`/clients/search?${qs.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return items.map((c) => ({ id: c.id, label: pickLabel(c), raw: c }));
  } catch {
    return [];
  }
}
