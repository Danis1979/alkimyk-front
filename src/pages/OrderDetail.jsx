// src/pages/OrderDetail.jsx
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById } from '../services/orders.service';
import { fmtCurrency } from '../lib/format';

function Row({ label, value, align = 'left' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '6px 0' }}>
      <div style={{ color: '#475569' }}>{label}</div>
      <div style={{ textAlign: align }}>{value}</div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id),
  });

  // Normalizaciones de encabezado
  const order = data || {};
  const oid   = order.id ?? Number(id);
  const dateISO = order.date ?? order.fecha ?? null;
  const dateStr = dateISO ? new Date(dateISO).toLocaleDateString('es-AR') : '—';
  const client  = order.client ?? order.cliente ?? order.clientName ?? order.customer ?? '—';
  const total   = order.total ?? order.subtotal ?? 0;

  // Normalización de ítems
  const itemsRaw = Array.isArray(order.items) ? order.items : [];
  const items = itemsRaw.map((it, idx) => {
    const qty   = Number(it.qty ?? it.quantity ?? it.cantidad ?? 0) || 0;
    const price = Number(it.price ?? it.precio ?? 0) || 0;
    const line  = Number(it.lineTotal ?? it.total ?? qty * price) || 0;
    const prodLabel =
      it.product ??
      it.productName ??
      it.name ??
      (it.productId ? `#${it.productId}` : `(Item ${idx + 1})`);
    return {
      key: it.id ?? `${idx}-${prodLabel}`,
      product: prodLabel,
      qty,
      price,
      line,
    };
  });

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header con acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>
          Orden #{oid}
        </h1>
        <Link
          to="/sales"
          style={{
            textDecoration: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 14,
          }}
        >
          ← Volver a ventas
        </Link>
      </div>

      {/* Estados */}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}
      {isError && (
        <div style={{ color: '#b91c1c', marginBottom: 8 }}>
          Error cargando la orden {String(id)}.
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {error?.message || 'Sin detalle'}
          </div>
        </div>
      )}

      {/* Encabezado */}
      {!isLoading && !isError && (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            background: '#fff',
          }}
        >
          <Row label="Cliente" value={client} />
          <Row label="Fecha" value={dateStr} />
          <Row label="Total" value={fmtCurrency(total)} align="right" />
        </div>
      )}

      {/* Ítems */}
      {!isLoading && !isError && (
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
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>
                  Producto
                </th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>
                  Cantidad
                </th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>
                  Precio
                </th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>
                  Importe
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.key} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>{it.product}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {Number.isFinite(it.qty) ? it.qty : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {fmtCurrency(it.price)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {fmtCurrency(it.line)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 14, color: '#64748b' }}>
                    Sin renglones para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie: acceso rápido */}
      {!isLoading && !isError && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Link
            to="/sales"
            style={{
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            ← Volver a ventas
          </Link>
          <Link
            to="/sales/new"
            style={{
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            + Nueva venta
          </Link>
        </div>
      )}
    </div>
  );
}