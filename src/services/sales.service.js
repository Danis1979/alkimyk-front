// src/services/sales.service.js
import { http } from '../lib/http';

/** Intenta GET sobre varios paths hasta que alguno responda 200 */
async function tryGet(paths) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await http.get(p);
      return data;
    } catch (e) {
      lastErr = e;
      if (e?.response?.status === 404) continue;
    }
  }
  if (lastErr) console.warn('tryGet: all paths failed', paths, lastErr?.message || lastErr);
  return { items: [] };
}

export async function listClients(limit = 100) {
  // Ajustá si tu API usa otro esquema; estos son fallbacks comunes
  const data = await tryGet([
    `/clients?limit=${limit}`,
    `/clients/search?limit=${limit}`,
    `/clients/list?limit=${limit}`
  ]);
  // Normalizamos a array simple
  return Array.isArray(data) ? data : (data.items || []);
}

export async function listProducts(limit = 100) {
  const data = await tryGet([
    `/products?limit=${limit}`,
    `/products/search?limit=${limit}`,
    `/products/list?limit=${limit}`
  ]);
  return Array.isArray(data) ? data : (data.items || []);
}

/**
 * Crea una venta y espera que el backend ejecute la transacción completa:
 * - inserta en sales
 * - OUT en inventory_moves por item
 * - ledger según pm (Caja/Banco/Cheques/CC)
 * - receivables/cheques si corresponde
 *
 * Intentamos varios endpoints por compatibilidad.
 */
export async function createSaleTx(payload) {
  const candidates = [
    '/tx/sales',    // recomendado
    '/sales/tx',    // alternativa
    '/sales'        // muchas APIs aceptan ventas aquí y resuelven internamente
  ];

  let lastErr;
  for (const path of candidates) {
    try {
      const { data } = await http.post(path, payload);
      return data;
    } catch (e) {
      lastErr = e;
      // si 404 probamos el siguiente; otros errores se propagan
      if (e?.response?.status === 404) continue;
      throw e;
    }
  }
  throw lastErr || new Error('No tx endpoint for sales');
}