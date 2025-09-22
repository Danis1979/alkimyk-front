// src/services/orders.service.js
import { http } from '../lib/http';

/**
 * Trae el detalle de una orden.
 * 1) Intenta /orders/:id/full (con items completos)
 * 2) Si no está (404) o falla, cae a /orders/:id (detalle simple)
 */
export async function fetchOrderById(id, { preferFull = true } = {}) {
  const orderId = String(id).trim();

  // helper para leer "data" (Axios-like o fetch wrapper)
  const readData = (resp) => {
    if (!resp) return null;
    if (typeof resp === 'object' && 'data' in resp) return resp.data;
    return resp;
  };

  if (preferFull) {
    try {
      const resp = await http.get(`/orders/${orderId}/full`);
      const data = readData(resp);
      if (data) return data;
    } catch (err) {
      const status = err?.response?.status ?? err?.status;
      // si no existe o dio error de servidor, probamos el simple
      if (![404, 400, 500, 501, 502, 503, 504].includes(Number(status))) {
        // si es otro error (p.ej. auth), lo re-lanzamos
        throw err;
      }
    }
  }

  // Fallback simple
  const resp = await http.get(`/orders/${orderId}`);
  return readData(resp);
}