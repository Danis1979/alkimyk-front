// src/pages/OrderDetail.jsx
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById } from '../services/orders.service';
import { fmtCurrency } from '../lib/format';
import { useState, useMemo } from 'react';

function Label({ children }) {
  return (
    <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>
      {children}
    </span>
  );
}

// Normaliza cabecera e ítems a un formato estable para la UI
function normalizeDetail(raw) {
  if (!raw) return { id: null, date: null, client: '', total: 0, items: [], _origin: 'unknown', _raw: raw };

  const id = raw.id ?? raw.orderId ?? null;
  const date = raw.fecha ?? raw.date ?? null;
  const client = raw.client ?? raw.cliente ?? raw.clientName ?? raw.customer ?? '';
  const total = Number(raw.total ?? raw.grandTotal ?? raw.subtotal ?? 0);

  // Ítems posibles: .items (final), .lines, .detalle, etc.
  const list =
    (Array.isArray(raw.items) && raw.items) ||
    (Array.isArray(raw.lines) && raw.lines) ||
    (Array.isArray(raw.detalle) && raw.detalle) ||
    [];

  const items = list.map((it, idx) => {
    const qty = Number(it.qty ?? it.quantity ?? it.cantidad ?? 0);
    const price = Number(it.price ?? it.precio ?? it.unitPrice ?? 0);

    // 👇 Evitamos mezclar ?? con ||: resolvemos el fallback en una variable
    const prodFallback =
      (it.productId != null ? `#${it.productId}` :
       it.insumoId  != null ? `#${it.insumoId}`  :
       `Ítem ${idx + 1}`);

    const prod =
      it.product ??
      it.productName ??
      it.name ??
      prodFallback;

    return {
      key: it.id ?? `${idx}`,
      product: prod,
      qty,
      price,
      lineTotal: qty * price,
    };
  });

  const hasStructuredItems = items.some(i => i.qty > 0 || i.price > 0);
  const _origin = hasStructuredItems ? 'full' : 'legacy';

  return { id, date, client, total, items, _origin, _raw: raw };
}

export default function OrderDetail() {
  const { id } = useParams();
  const [showJson, setShowJson] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['orders.detail', id],
    queryFn: () => fetchOrderById(id),
  });

  const view = useMemo(() => normalizeDetail(data), [data]);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>
          Pedido / Venta #{view.id ?? id}
        </h1>
        <Link
          to="/sales"
          style={{
            textDecoration: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
            background: '#fff',
          }}
        >
          ← Volver a ventas
        </Link>
      </div>

      {isError && (
        <div style={{ color: '#b91c1c', marginBottom: 12 }}>
          Error cargando detalle{error?.message ? `: ${error.message}` : ''}.
        </div>
      )}
      {isLoading && <div style={{ color: '#475569', marginBottom: 12 }}>Cargando…</div>}

      {!isLoading && !isError && (
        <>
          {/* Cabecera */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div>
                <Label>ID</Label>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>#{view.id ?? id}</div>
              </div>
              <div>
                <Label>Fecha</Label>
                <div style={{ color: '#0f172a' }}>
                  {view.date ? new Date(view.date).toLocaleDateString('es-AR') : '—'}
                </div>
              </div>
              <div>
                <Label>Cliente</Label>
                <div style={{ color: '#0f172a' }}>{view.client || '—'}</div>
              </div>
              <div>
                <Label>Total</Label>
                <div style={{ fontWeight: 700 }}>{fmtCurrency(view.total || 0)}</div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid #cbd5e1',
                  background: view._origin === 'full' ? '#f0fdf4' : '#f8fafc',
                  color: view._origin === 'full' ? '#166534' : '#64748b',
                  fontSize: 12,
                }}
                title={
                  view._origin === 'full'
                    ? 'Detalle desde /orders/:id/full (ítems completos)'
                    : 'Detalle simple (fallback /orders/:id)'
                }
              >
                {view._origin}
              </span>

              <button
                onClick={() => setShowJson(s => !s)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '6px 10px',
                  background: '#fff',
                }}
                title="Mostrar/ocultar JSON crudo (debug)"
              >
                {showJson ? 'Ocultar JSON' : 'Ver JSON'}
              </button>
            </div>

            {showJson && (
              <pre
                style={{
                  marginTop: 10,
                  padding: 10,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#f8fafc',
                  maxHeight: 320,
                  overflow: 'auto',
                  fontSize: 12,
                }}
              >
                {JSON.stringify(view._raw, null, 2)}
              </pre>
            )}
          </div>

          {/* Ítems */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Producto</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Cantidad</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Precio</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((it, i) => (
                  <tr key={it.key ?? i} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 8px' }}>{it.product}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{it.qty}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(it.price)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(it.lineTotal)}</td>
                  </tr>
                ))}
                {view.items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 16, color: '#64748b' }}>
                      Sin ítems para mostrar (detalle simple). Cuando el backend exponga
                      <code> /orders/:id/full</code> vas a ver el desglose.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}