// src/services/production.service.js
import { http } from '../lib/http';

// Normaliza una OP del backend a un shape estable
function normOP(x = {}) {
  const id     = x.id ?? x.opId ?? x.ID ?? null;
  const fecha  = x.fecha ?? x.date ?? x.createdAt ?? null;
  const estado = x.estado ?? x.status ?? 'Planificada';
  // items de salida (producto terminado)
  const itemsProd = Array.isArray(x.itemsProd) ? x.itemsProd : (Array.isArray(x.prod) ? x.prod : []);
  // consumos (insumos)
  const consumos  = Array.isArray(x.consumos) ? x.consumos  : (Array.isArray(x.inputs) ? x.inputs : []);
  return {
    id, fecha, estado,
    itemsProd: itemsProd.map(it => ({
      productId: it.productId ?? it.id ?? it.itemId ?? null,
      product:   it.product   ?? it.name ?? it.sku ?? '',
      qty:       Number(it.qty ?? it.quantity ?? 0) || 0,
    })),
    consumos: consumos.map(it => ({
      insumoId:  it.insumoId ?? it.productId ?? it.id ?? it.itemId ?? null,
      insumo:    it.insumo   ?? it.product   ?? it.name ?? it.sku ?? '',
      qty:       Number(it.qty ?? it.quantity ?? 0) || 0,
    })),
    raw: x,
  };
}

// Búsqueda / listado de OPs con fallbacks de endpoint
export async function searchProductionOrders({
  page = 1, limit = 20, sort = '-fecha', estado, from, to, productId, q,
} = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort)      qs.set('sort', sort);
  if (estado)    qs.set('estado', estado);
  if (from)      qs.set('from', from);
  if (to)        qs.set('to', to);
  if (productId) qs.set('productId', String(productId));
  if (q)         qs.set('q', q);

  const tries = [
    `/production_orders/search?${qs.toString()}`,
    `/production/orders/search?${qs.toString()}`,
    `/production_orders?${qs.toString()}`,
    `/production/orders?${qs.toString()}`,
  ];

  for (const url of tries) {
    try {
      const { data } = await http.get(url);
      const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      return {
        items: arr.map(normOP),
        page : data?.page ?? page,
        pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(Number(data.total) / limit)) : undefined),
        total: data?.total,
        _debugTried: tries.slice(0, tries.indexOf(url) + 1),
      };
    } catch {}
  }
  return { items: [], page, pages: 1, total: 0 };
}

// Detalle por ID
export async function fetchProductionOrderById(id) {
  const urls = [
    `/production_orders/${id}/full`,
    `/production/orders/${id}/full`,
    `/production_orders/${id}`,
    `/production/orders/${id}`,
  ];
  for (const u of urls) {
    try { const { data } = await http.get(u); return normOP(data); } catch {}
  }
  return normOP({ id, itemsProd: [], consumos: [] });
}

// Alta de OP (Planificada)
export async function createProductionOrder(payload) {
  // payload: { fecha, itemsProd:[{productId, qty}], consumos:[{insumoId, qty}] }
  const tries = ['/production_orders', '/production/orders'];
  for (const u of tries) {
    try { const { data } = await http.post(u, payload); return normOP(data); } catch {}
  }
  throw new Error('No se pudo crear la OP');
}

// Acciones de estado (transiciones)
export async function startProductionOrder(id) {
  const tries = [
    `/production_orders/${id}/start`,
    `/production/orders/${id}/start`,
    `/production_orders/${id}?accion=start`,
  ];
  for (const u of tries) { try { const { data } = await http.post(u); return normOP(data); } catch {} }
  throw new Error('No se pudo iniciar la OP');
}

export async function closeProductionOrder(id) {
  const tries = [
    `/production_orders/${id}/close`,
    `/production/orders/${id}/close`,
    `/production_orders/${id}?accion=close`,
  ];
  for (const u of tries) { try { const { data } = await http.post(u); return normOP(data); } catch {} }
  throw new Error('No se pudo cerrar la OP');
}

export async function cancelProductionOrder(id) {
  const tries = [
    `/production_orders/${id}/cancel`,
    `/production/orders/${id}/cancel`,
    `/production_orders/${id}?accion=cancel`,
  ];
  for (const u of tries) { try { const { data } = await http.post(u); return normOP(data); } catch {} }
  throw new Error('No se pudo anular la OP');
}

// Obtener receta (BOM) por producto
export async function fetchRecipe(productId) {
  if (!productId) return null;
  const tries = [
    `/recipes/${productId}`,
    `/bom/${productId}`,
    `/recipes?productId=${productId}`,
  ];
  for (const u of tries) {
    try {
      const { data } = await http.get(u);
      const componentes = Array.isArray(data?.componentes) ? data.componentes
        : Array.isArray(data?.items) ? data.items : [];
      return {
        productId,
        componentes: componentes.map(c => ({
          insumoId: c.insumoId ?? c.productId ?? c.id ?? null,
          insumo:   c.insumo   ?? c.product   ?? c.name ?? '',
          qtyPorUnidad: Number(c.qtyPorUnidad ?? c.qty ?? 0) || 0,
        })),
        raw: data,
      };
    } catch {}
  }
  return null;
}