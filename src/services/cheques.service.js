// src/services/cheques.service.js
import { http } from '../lib/http';

// Normaliza segun tu modelo:
// {id, tipo:'recibido|emitido', origenId, banco, numero, emision, pago, importe, estado, notas}
function normCheque(x = {}) {
  return {
    id:       x.id ?? x.chequeId ?? x.ID ?? null,
    tipo:     x.tipo ?? x.kind ?? x.type ?? '', // 'recibido' | 'emitido'
    origenId: x.origenId ?? x.originId ?? x.refId ?? null,
    banco:    x.banco ?? x.bank ?? '',
    numero:   x.numero ?? x.number ?? x.nro ?? '',

    emision:  x.emision ?? x.fecha ?? x.date ?? x.issuedAt ?? null, // emisión
    pago:     x.pago ?? x.fechaPago ?? x.due ?? x.paidAt ?? null,   // fecha de pago / vencimiento (si aplica)

    importe:  Number(x.importe ?? x.amount ?? 0) || 0,
    estado:   x.estado ?? x.status ?? 'Pendiente',
    notas:    x.notas ?? x.notes ?? '',
    raw:      x,
  };
}

// Listado / búsqueda con fallbacks de endpoint
export async function searchCheques({
  page = 1, limit = 20, sort = '-emision', tipo, estado, from, to, banco, numero, q,
} = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sort)   qs.set('sort', sort);
  if (tipo)   qs.set('tipo', tipo);       // 'recibido' | 'emitido'
  if (estado) qs.set('estado', estado);   // Pendiente|Depositado|Acreditado|Rechazado|Vendido|Debitado
  if (from)   qs.set('from', from);
  if (to)     qs.set('to', to);
  if (banco)  qs.set('banco', banco);
  if (numero) qs.set('numero', numero);
  if (q)      qs.set('q', q);

  const tries = [
    `/cheques/search?${qs.toString()}`,
    `/checks/search?${qs.toString()}`,
    `/cheques?${qs.toString()}`,
    `/checks?${qs.toString()}`,
  ];

  for (const url of tries) {
    try {
      const { data } = await http.get(url);
      const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      return {
        items: arr.map(normCheque),
        page : data?.page ?? page,
        pages: data?.pages ?? (data?.total ? Math.max(1, Math.ceil(Number(data.total) / limit)) : undefined),
        total: data?.total,
        _debugTried: tries.slice(0, tries.indexOf(url) + 1),
      };
    } catch {}
  }
  return { items: [], page, pages: 1, total: 0 };
}

// Acciones (el asiento en ledger lo hace el backend)
async function postTry(urls, body) {
  for (const u of urls) {
    try { const { data } = await http.post(u, body); return normCheque(data); } catch {}
  }
  throw new Error('Acción no disponible en backend');
}

// Recibidos → Depositar (ledger: ChequesRecibidos → Banco)
export async function depositCheque(id, { fecha }) {
  const body = fecha ? { fecha } : undefined;
  return postTry([
    `/cheques/${id}/deposit`, `/checks/${id}/deposit`,
    `/cheques/${id}?accion=deposit`, `/checks/${id}?accion=deposit`,
  ], body);
}

// Recibidos → Vender (descuento): entra hoy a Banco (HABER), queda estado:'Vendido'
export async function sellCheque(id, { fecha, importeNeto } = {}) {
  const body = {};
  if (fecha) body.fecha = fecha;
  if (importeNeto != null) body.importeNeto = importeNeto;
  return postTry([
    `/cheques/${id}/sell`, `/checks/${id}/sell`,
    `/cheques/${id}?accion=sell`, `/checks/${id}?accion=sell`,
  ], body);
}

// Emitidos → Debitado (al acreditarse el pago)
export async function debitCheque(id, { fecha } = {}) {
  const body = fecha ? { fecha } : undefined;
  return postTry([
    `/cheques/${id}/debit`, `/checks/${id}/debit`,
    `/cheques/${id}?accion=debit`, `/checks/${id}?accion=debit`,
  ], body);
}

// Emitidos o Recibidos → Rechazado
export async function rejectCheque(id, { fecha, motivo } = {}) {
  const body = {};
  if (fecha)  body.fecha  = fecha;
  if (motivo) body.motivo = motivo;
  return postTry([
    `/cheques/${id}/reject`, `/checks/${id}/reject`,
    `/cheques/${id}?accion=reject`, `/checks/${id}?accion=reject`,
  ], body);
}