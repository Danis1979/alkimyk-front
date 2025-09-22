// src/services/orders.service.js
import { http } from '../lib/http';

/** Normaliza una fila (order o sale legacy) a un formato estable para la UI */
function normalizeRow(o) {
  const id = o?.id;
  const date = o?.createdAt ?? o?.date ?? null;
  const client =
    typeof o?.client === 'string'
      ? o.client
      : o?.client?.name ?? o?.client?.email ?? '';
  const total =
    typeof o?.subtotal === 'number'
      ? o.subtotal
      : Number(o?.total ?? 0);
  const status = (o?.status ?? o?.estado ?? null) || null;

  return { id, date, client, total, status, raw: o };
}

/**
 * Lista de pedidos/ventas con filtros/paginación.
 * Intenta el endpoint nuevo `/orders/search` y, si falla o no trae items, hace
 * fallback automático a `/orders/compat/search`.
 */
export async function searchOrders({
  page = 1,
  limit = 20,
  from,
  to,
  status,
  clientEmail,
} = {}) {
  const skip = Math.max(0, (page - 1) * limit);
  const qs = new URLSearchParams({ skip: String(skip), take: String(limit) });
  if (from) qs.set('date_from', from);        // YYYY-MM-DD
  if (to) qs.set('date_to', to);              // YYYY-MM-DD
  if (status) qs.set('status', status);       // CONFIRMADO|PENDIENTE|...
  if (clientEmail) qs.set('clientEmail', clientEmail);

  let data;
  // 1) Intento endpoint nuevo
  try {
    ({ data } = await http.get(`/orders/search?${qs.toString()}`));
  } catch (_) {
    // ignore y probamos compat
  }

  // 2) Si falló o no trajo items, voy a compat
  if (!Array.isArray(data?.items)) {
    try {
      const res2 = await http.get(`/orders/compat/search?${qs.toString()}`);
      data = res2.data;
    } catch {
      data = { items: [], total: 0 };
    }
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  const mapped = items.map(normalizeRow);
  const total = Number(data?.total ?? mapped.length) || mapped.length;

  return {
    items: mapped,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Detalle por ID:
 * - Primero intenta `/orders/:id/full` (con ítems).
 * - Si falla, cae a `/orders/:id` simple.
 */
export async function fetchOrderById(id) {
  try {
    const { data } = await http.get(`/orders/${id}/full`);
    if (data) return data;
  } catch {
    // seguimos al fallback
  }
  const { data } = await http.get(`/orders/${id}`);
  return data;
}

/**
 * Crea un pedido (POST /orders)
 * body esperado:
 * {
 *   clientEmail?: string,
 *   clientName?: string,
 *   date?: 'YYYY-MM-DD',
 *   notes?: string,
 *   items: Array&lt;{ productId: string|number, qty: number, price: number }&gt;
 * }
 * Devuelve el objeto creado (con id).
 */
export async function createOrder({
  clientEmail,
  clientName,
  date,
  notes,
  items,
}) {
  const payload = {
    clientEmail: clientEmail || undefined,
    clientName: clientName || undefined,
    date: date || undefined,
    notes: notes || undefined,
    items: Array.isArray(items)
      ? items.map(it => ({
          productId: it.productId,
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
        }))
      : [],
  };

  // Primero intento el endpoint nuevo
  try {
    const { data } = await http.post('/orders', payload);
    return data;
  } catch (e) {
    // Si el backend no tiene /orders POST aún, dejamos propagar el error
    // (o acá podríamos intentar un fallback si existiera /sales)
    throw e;
  }
}
// Back-compat: algunas pantallas siguen importando fetchOrders
export const fetchOrders = searchOrders;
