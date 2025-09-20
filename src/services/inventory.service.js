// src/services/inventory.service.js
import { http } from '../lib/http';

// Normaliza un movimiento de inventario a un shape estable en el front
function normMove(m = {}) {
  const fecha = m.fecha ?? m.date ?? null;
  const productId = m.productId ?? m.insumoId ?? m.itemId ?? null;
  const product = m.product ?? m.nombre ?? m.name ?? m.sku ?? '';
  const direction = String((m.direction ?? m.dir ?? '')).toUpperCase(); // IN | OUT
  const motivo = m.motivo ?? m.reason ?? m.type ?? '';
  // qty siempre positiva; signo se maneja en UI según direction
  const qty = Number(m.qty ?? m.quantity ?? 0) || 0;

  // Referencia (opcional) uniforme
  const ref = m.ref ?? (m.refType || m.refId ? { type: m.refType ?? null, id: m.refId ?? null } : null);

  return { id: m.id, fecha, productId, product, direction, motivo, qty, ref, raw: m };
}

// Busca movimientos con fallbacks de endpoints
export async function searchInventoryMoves({
  page = 1,
  limit = 20,
  sort = '-fecha',      // -fecha | fecha | -qty | qty
  productId,
  from,
  to,
  direction,            // IN | OUT (opcional)
  motivo,               // compra|venta|produccion-in|produccion-out|ajuste (opcional)
  q                     // texto libre (sku/nombre/ref)
} = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort) qs.set('sort', sort);
  if (productId) qs.set('productId', String(productId));
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (direction) qs.set('direction', direction);
  if (motivo) qs.set('motivo', motivo);
  if (q) qs.set('q', q);

  const tries = [
    `/inventory/moves/search?${qs.toString()}`,
    `/inventory_moves/search?${qs.toString()}`,
    `/inventory/moves?${qs.toString()}`,
    `/inventory_moves?${qs.toString()}`,
  ];

  for (const url of tries) {
    try {
      const { data } = await http.get(url);
      const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      return {
        items: arr.map(normMove),
        page : data?.page ?? page,
        pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(Number(data.total) / limit)) : undefined),
        total: data?.total,
        _debugTried: tries.slice(0, tries.indexOf(url) + 1),
      };
    } catch {}
  }

  return { items: [], page, pages: 1, total: 0, _debugTried: tries };
}

// Stock on hand para un producto (si tu backend lo expone)
export async function fetchStockLatest(productId) {
  if (!productId) return null;
  const tries = [
    `/stock/latest/${productId}`,
    `/stock/latest?productId=${productId}`,
    `/stock_latest/${productId}`,
    `/stock_latest?productId=${productId}`,
  ];
  for (const url of tries) {
    try {
      const { data } = await http.get(url);
      // Aceptamos {onHand} o número directo
      if (data == null) continue;
      if (typeof data === 'number') return { productId, onHand: data, _url: url };
      if (typeof data?.onHand !== 'undefined') return { productId, onHand: Number(data.onHand) || 0, _url: url };
    } catch {}
  }
  return null;
}