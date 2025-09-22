import { http } from '../lib/http';

const pageMeta = (arr, page, limit, totalMaybe) => {
  const total = Number.isFinite(totalMaybe) ? totalMaybe : arr.length;
  return { items: arr, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
};

const normalizeClient = (c) => ({
  id: c.id ?? c._id ?? c.code ?? c.email ?? undefined,
  name: c.name ?? c.nombre ?? c.razonSocial ?? '',
  email: c.email ?? c.mail ?? '',
  phone: c.phone ?? c.telefono ?? '',
  taxId: c.taxId ?? c.cuit ?? '',
  raw: c,
});
const normalizeSupplier = (s) => ({
  id: s.id ?? s._id ?? s.code ?? s.email ?? undefined,
  name: s.name ?? s.nombre ?? s.razonSocial ?? '',
  email: s.email ?? s.mail ?? '',
  phone: s.phone ?? s.telefono ?? '',
  taxId: s.taxId ?? s.cuit ?? '',
  raw: s,
});
const normalizeProduct = (p) => ({
  id: p.id ?? p._id ?? p.code ?? p.sku ?? undefined,
  sku: p.sku ?? p.code ?? '',
  name: p.name ?? p.nombre ?? '',
  price: Number(p.price ?? p.precio ?? p.unitPrice ?? 0),
  stock: Number(p.stock ?? p.qty ?? p.cantidad ?? 0),
  raw: p,
});

// ===== Clients
export async function searchClients({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);
  try {
    const { data } = await http.get(`/clients/search?${qs.toString()}`);
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return pageMeta(list.map(normalizeClient), page, limit, data?.total ?? list.length);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    const { data } = await http.get('/clients');
    const all = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const allN = all.map(normalizeClient);
    const filtered = q
      ? allN.filter(c => `${c.name} ${c.email} ${c.taxId}`.toLowerCase().includes(q.toLowerCase()))
      : allN;
    const slice = filtered.slice(skip, skip + limit);
    return pageMeta(slice, page, limit, filtered.length);
  }
}
export async function createClient(payload) {
  try { const { data } = await http.post('/clients', payload); return normalizeClient(data); }
  catch (err) { if (err?.response?.status === 404) throw new Error('El backend aún no implementa POST /clients.'); throw err; }
}

// ===== Suppliers
export async function searchSuppliers({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);
  try {
    const { data } = await http.get(`/suppliers/search?${qs.toString()}`);
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return pageMeta(list.map(normalizeSupplier), page, limit, data?.total ?? list.length);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    const { data } = await http.get('/suppliers');
    const all = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const allN = all.map(normalizeSupplier);
    const filtered = q
      ? allN.filter(s => `${s.name} ${s.email} ${s.taxId}`.toLowerCase().includes(q.toLowerCase()))
      : allN;
    const slice = filtered.slice(skip, skip + limit);
    return pageMeta(slice, page, limit, filtered.length);
  }
}
export async function createSupplier(payload) {
  try { const { data } = await http.post('/suppliers', payload); return normalizeSupplier(data); }
  catch (err) { if (err?.response?.status === 404) throw new Error('El backend aún no implementa POST /suppliers.'); throw err; }
}

// ===== Products
export async function searchProducts({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);
  try {
    const { data } = await http.get(`/products/search?${qs.toString()}`);
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return pageMeta(list.map(normalizeProduct), page, limit, data?.total ?? list.length);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    const { data } = await http.get('/products');
    const all = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const allN = all.map(normalizeProduct);
    const filtered = q
      ? allN.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()))
      : allN;
    const slice = filtered.slice(skip, skip + limit);
    return pageMeta(slice, page, limit, filtered.length);
  }
}
export async function createProduct(payload) {
  try { const { data } = await http.post('/products', payload); return normalizeProduct(data); }
  catch (err) { if (err?.response?.status === 404) throw new Error('El backend aún no implementa POST /products.'); throw err; }
}
