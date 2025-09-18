const API = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchOrdersSearch({ page=1, limit=20, sort } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  const res = await fetch(`${API}/orders/search?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json();
}
