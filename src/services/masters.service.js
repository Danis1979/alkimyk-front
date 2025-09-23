// src/services/masters.service.js
import { http } from '../lib/http';

const pageMeta = (arr, page, limit, totalMaybe) => {
  const total = Number.isFinite(totalMaybe) ? totalMaybe : arr.length;
  return { items: arr, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
};

// ---------- Normalizadores ----------
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

// ---------- Utilidades de fallback ----------
const isErrorBody = (data) => {
  // Muchos backends devuelven 200 con { statusCode: 404, message: "Cannot GET /..." }
  if (!data || typeof data !== 'object') return false;
  if (Number.isFinite(data.statusCode) && data.statusCode >= 400) return true;
  if (typeof data.message === 'string' && /^Cannot\s+(GET|POST|PUT|DELETE)\s+/i.test(data.message)) return true;
  if (typeof data.error === 'string' && data.error.length > 0) {
    // ej: { error: "Not Found" }
    return true;
  }
  return false;
};

const itemsArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
};

// Devuelve el primer endpoint que responda con un "shape" útil.
// Si el GET falla con 404 o 5xx o responde un body de error, continúa con el siguiente.
async function getWithFallback(urls, { requireItemsArray = false, debugLabel = '' } = {}) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const { data } = await http.get(url);
      // Si el body parece error (aunque sea 200), seguimos probando
      if (isErrorBody(data)) {
        if (import.meta?.env?.DEV) console.warn(`[masters][${debugLabel}] Body de error en ${url}`, data);
        continue;
      }
      // Validación opcional de forma
      if (requireItemsArray) {
        const arr = itemsArray(data);
        if (!Array.isArray(arr)) {
          if (import.meta?.env?.DEV) console.warn(`[masters][${debugLabel}] Sin items[] en ${url}`);
          continue;
        }
      }
      return { data, url };
    } catch (err) {
      lastErr = err;
      const st = err?.response?.status;
      if (st === 404 || (st >= 500 && st < 600) || !st) {
        // seguimos con el próximo candidato
        if (import.meta?.env?.DEV) console.warn(`[masters][${debugLabel}] ${url} => ${st || err?.message}; sigo...`);
        continue;
      }
      // Otros códigos: cortamos y propagamos
      throw err;
    }
  }
  // Si ninguno funcionó, devolvemos nulo y dejamos que cada caller maneje el caso
  if (import.meta?.env?.DEV) console.warn(`[masters][${debugLabel}] ningún endpoint respondió OK`, { urls, lastErr });
  return { data: null, url: null };
}

// POST con fallback a múltiples endpoints (ignora bodies de error y 404)
async function postFirstOK(endpoints, payload, { debugLabel = '' } = {}) {
  for (const ep of endpoints) {
    try {
      const { data } = await http.post(ep, payload);
      if (isErrorBody(data)) {
        if (import.meta?.env?.DEV) console.warn(`[masters][${debugLabel}] Body de error en POST ${ep}`, data);
        continue;
      }
      return data;
    } catch (err) {
      const st = err?.response?.status;
      if (st === 404 || (st >= 500 && st < 600)) {
        if (import.meta?.env?.DEV) console.warn(`[masters][${debugLabel}] POST ${ep} => ${st}; sigo...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Ningún endpoint aceptó el POST.');
}

// ===================================================================
// Clients
// ===================================================================
export async function searchClients({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);

  const candidates = [
    // Prefer /compat first (backend actual)
    `/compat/clients/search?${qs.toString()}`,
    `/clients/compat/search?${qs.toString()}`,
    `/clients/search?${qs.toString()}`,

    // Also try with /api prefix (nginx/proxy)
    `/api/compat/clients/search?${qs.toString()}`,
    `/api/clients/compat/search?${qs.toString()}`,
    `/api/clients/search?${qs.toString()}`,

    // Fallback sin /search (listado)
    `/compat/clients?${qs.toString()}`,
    `/clients/compat?${qs.toString()}`,
    `/clients?${qs.toString()}`,

    // Con /api prefix
    `/api/compat/clients?${qs.toString()}`,
    `/api/clients/compat?${qs.toString()}`,
    `/api/clients?${qs.toString()}`,

    // Ultra fallback sin paginado
    `/compat/clients`,
    `/clients/compat`,
    `/clients`,
    `/api/compat/clients`,
    `/api/clients/compat`,
    `/api/clients`,
  ];

  const { data, url: used } = await getWithFallback(candidates, { requireItemsArray: false, debugLabel: 'clients' });
  const listN = itemsArray(data).map(normalizeClient);

  // Si el usado no fue /search, filtramos/paginamos manual
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
  const data = await postFirstOK(
    ['/clients', '/clients/compat', '/compat/clients'],
    payload,
    { debugLabel: 'clients.create' }
  );
  return normalizeClient(data);
}

// ===================================================================
// Suppliers
// ===================================================================
export async function searchSuppliers({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);

  const candidates = [
    // Prefer /compat first
    `/compat/suppliers/search?${qs.toString()}`,
    `/suppliers/compat/search?${qs.toString()}`,
    `/suppliers/search?${qs.toString()}`,

    // /api prefix
    `/api/compat/suppliers/search?${qs.toString()}`,
    `/api/suppliers/compat/search?${qs.toString()}`,
    `/api/suppliers/search?${qs.toString()}`,

    // Fallback sin /search
    `/compat/suppliers?${qs.toString()}`,
    `/suppliers/compat?${qs.toString()}`,
    `/suppliers?${qs.toString()}`,

    // Con /api prefix
    `/api/compat/suppliers?${qs.toString()}`,
    `/api/suppliers/compat?${qs.toString()}`,
    `/api/suppliers?${qs.toString()}`,

    // Ultra fallback
    `/compat/suppliers`,
    `/suppliers/compat`,
    `/suppliers`,
    `/api/compat/suppliers`,
    `/api/suppliers/compat`,
    `/api/suppliers`,
  ];

  const { data, url: used } = await getWithFallback(candidates, { requireItemsArray: false, debugLabel: 'suppliers' });
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
  const data = await postFirstOK(
    ['/suppliers', '/suppliers/compat', '/compat/suppliers'],
    payload,
    { debugLabel: 'suppliers.create' }
  );
  return normalizeSupplier(data);
}

// ===================================================================
// Products
// ===================================================================
export async function searchProducts({ q = '', page = 1, limit = 20 } = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (q) qs.set('q', q);

  const candidates = [
    // Prefer /compat first
    `/compat/products/search?${qs.toString()}`,
    `/products/compat/search?${qs.toString()}`,
    `/products/search?${qs.toString()}`,

    // /api prefix
    `/api/compat/products/search?${qs.toString()}`,
    `/api/products/compat/search?${qs.toString()}`,
    `/api/products/search?${qs.toString()}`,

    // Fallback sin /search
    `/compat/products?${qs.toString()}`,
    `/products/compat?${qs.toString()}`,
    `/products?${qs.toString()}`,

    // Con /api prefix
    `/api/compat/products?${qs.toString()}`,
    `/api/products/compat?${qs.toString()}`,
    `/api/products?${qs.toString()}`,

    // Ultra fallback
    `/compat/products`,
    `/products/compat`,
    `/products`,
    `/api/compat/products`,
    `/api/products/compat`,
    `/api/products`,
  ];

  const { data, url: used } = await getWithFallback(candidates, { requireItemsArray: false, debugLabel: 'products' });
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
  const data = await postFirstOK(
    ['/products', '/products/compat', '/compat/products'],
    payload,
    { debugLabel: 'products.create' }
  );
  return normalizeProduct(data);
}