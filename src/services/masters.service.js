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

// --- helpers: probe multiple endpoints and adapt shape ---
async function getFirstOK(urls) {
  for (const url of urls) {
    try {
      const { data } = await http.get(url);
      return { data, url };
    } catch (err) {
      const st = err?.response?.status;
      // si 404 o 5xx => probamos el siguiente; otros errores se re-lanzan
      if (st === 404 || (st >= 500 && st < 600)) continue;
      throw err;
    }
  }
  return { data: null, url: null };
}

function itemsArray(data) {
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
}

// ===== Clients
export async function searchClients({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);

  const { data, url: used } = await getFirstOK([
    `/clients/search?${qs.toString()}`,
    '/clients',
    `/clients/compat/search?${qs.toString()}`,
    `/compat/clients/search?${qs.toString()}`,
    '/compat/clients',
  ]);

  const listN = itemsArray(data).map(normalizeClient);
  const isSearch = !!(used && used.includes('/search'));

  if (!isSearch) {
    const filtered = q
      ? listN.filter(c => `${c.name} ${c.email} ${c.taxId}`.toLowerCase().includes(q.toLowerCase()))
      : listN;
    const slice = filtered.slice(skip, skip + limit);
    return pageMeta(slice, page, limit, filtered.length);
  }
  return pageMeta(listN, page, limit, data?.total ?? listN.length);
}
export async function createClient(payload) {
  const endpoints = ['/clients', '/clients/compat', '/compat/clients'];
  for (const ep of endpoints) {
    try {
      const { data } = await http.post(ep, payload);
      return normalizeClient(data);
    } catch (err) {
      if (err?.response?.status === 404) continue;
      throw err;
    }
  }
  throw new Error('El backend aún no implementa POST /clients.');
}

// ===== Suppliers
export async function searchSuppliers({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);

  const { data, url: used } = await getFirstOK([
    `/suppliers/search?${qs.toString()}`,
    '/suppliers',
    `/suppliers/compat/search?${qs.toString()}`,
    `/compat/suppliers/search?${qs.toString()}`,
    '/compat/suppliers',
  ]);

  const listN = itemsArray(data).map(normalizeSupplier);
  const isSearch = !!(used && used.includes('/search'));

  if (!isSearch) {
    const filtered = q
      ? listN.filter(s => `${s.name} ${s.email} ${s.taxId}`.toLowerCase().includes(q.toLowerCase()))
      : listN;
    const slice = filtered.slice(skip, skip + limit);
    return pageMeta(slice, page, limit, filtered.length);
  }
  return pageMeta(listN, page, limit, data?.total ?? listN.length);
}
export async function createSupplier(payload) {
  const endpoints = ['/suppliers', '/suppliers/compat', '/compat/suppliers'];
  for (const ep of endpoints) {
    try {
      const { data } = await http.post(ep, payload);
      return normalizeSupplier(data);
    } catch (err) {
      if (err?.response?.status === 404) continue;
      throw err;
    }
  }
  throw new Error('El backend aún no implementa POST /suppliers.');
}

// ===== Products
export async function searchProducts({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);

  const { data, url: used } = await getFirstOK([
    `/products/search?${qs.toString()}`,
    '/products',
    `/products/compat/search?${qs.toString()}`,
    `/compat/products/search?${qs.toString()}`,
    '/compat/products',
  ]);

  const listN = itemsArray(data).map(normalizeProduct);
  const isSearch = !!(used && used.includes('/search'));

  if (!isSearch) {
    const filtered = q
      ? listN.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()))
      : listN;
    const slice = filtered.slice(skip, skip + limit);
    return pageMeta(slice, page, limit, filtered.length);
  }
  return pageMeta(listN, page, limit, data?.total ?? listN.length);
}
export async function createProduct(payload) {
  const endpoints = ['/products', '/products/compat', '/compat/products'];
  for (const ep of endpoints) {
    try {
      const { data } = await http.post(ep, payload);
      return normalizeProduct(data);
    } catch (err) {
      if (err?.response?.status === 404) continue;
      throw err;
    }
  }
  throw new Error('El backend aún no implementa POST /products.');
}
