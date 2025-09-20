// src/pages/OrderDetail.jsx
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fmtCurrency } from '../lib/format';
import { fetchOrderById } from '../services/orders.service';

// Helpers de normalización
function n(v, ...alts) {
  for (const x of [v, ...alts]) if (x !== undefined && x !== null) return x;
  return undefined;
}
function num(x) {
  const v = parseFloat(x);
  return Number.isFinite(v) ? v : 0;
}
function normItem(it = {}) {
  const product = n(it.product, it.productName, it.name, '(s/n)') || '(s/n)';
  const qty     = num(n(it.qty, it.cantidad, it.quantity, 0));
  const price   = num(n(it.price, it.precio, 0));
  // si viene lineTotal lo usamos, si no qty*price
  const lineTotal = num(n(it.lineTotal, it.total, qty * price));
  return { product, qty, price, lineTotal, _raw: it };
}
function normHeader(h = {}) {
  const id     = n(h.id);
  const date   = n(h.date, h.fecha, null);
  const client = n(h.client, h.cliente, h.clientName, h.customer, '');
  const pm     = n(h.pm, h.medioPago, h.paymentMethod, null);
  const estado = n(h.estado, h.status, null);
  const afip   = n(h.afip, null);
  const items  = Array.isArray(h.items) ? h.items.map(normItem) : [];

  // Totales: usamos los del backend si vienen; si no, calculamos desde ítems
  const subtotalItems = items.reduce((a, it) => a + num(it.qty) * num(it.price), 0);
  const totalItems    = items.reduce((a, it) => a + num(it.lineTotal), 0) || subtotalItems;
  const subtotal = num(n(h.subtotal, subtotalItems));
  const iva      = num(n(h.iva, (h.total != null && h.subtotal != null) ? (h.total - h.subtotal) : 0));
  const total    = num(n(h.total, totalItems));

  return { id, date, client, pm, estado, afip, items, subtotal, iva, total, _raw: h };
}

export default function OrderDetail() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order.detail', id],
    queryFn: () => fetchOrderById(id),
    staleTime: 30_000,
  });

  const h = normHeader(data || {});
  const dateStr = h.date ? new Date(h.date).toLocaleDateString('es-AR') : '—';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>
          Venta #{h.id ?? id}
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

      {/* Estado de carga/errores */}
      {isError && (
        <div style={{ color: '#b91c1c', marginBottom: 8 }}>
          Error cargando el detalle.
        </div>
      )}
      {isLoading && (
        <div style={{ color: '#475569', marginBottom: 8 }}>
          Cargando…
        </div>
      )}

      {/* Cabecera de la venta */}
      {!isLoading && (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
            background: '#fff',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>Fecha</div>
              <div style={{ fontWeight: 600 }}>{dateStr}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>Cliente</div>
              <div style={{ fontWeight: 600 }}>{h.client || '—'}</div>
            </div>
            {h.pm && (
              <div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>Medio de pago</div>
                <div style={{ fontWeight: 600 }}>{h.pm}</div>
              </div>
            )}
            {h.estado && (
              <div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>Estado</div>
                <div style={{ fontWeight: 600 }}>{h.estado}</div>
              </div>
            )}
            {h.afip && (h.afip.tipo || h.afip.cae) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>AFIP</div>
                <div style={{ fontWeight: 600 }}>
                  {h.afip.tipo ? `Tipo ${h.afip.tipo}` : ''} {h.afip.cae ? `• CAE ${h.afip.cae}` : ''}{' '}
                  {h.afip.vtoCae ? `• Vto ${new Date(h.afip.vtoCae).toLocaleDateString('es-AR')}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ítems */}
      {!isLoading && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Producto</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Cantidad</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Precio</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {h.items.map((it, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>{it.product}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{it.qty}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(it.price)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(it.lineTotal)}</td>
                </tr>
              ))}
              {h.items.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: '#64748b' }}>
                    Esta venta no tiene renglones en el backend (o es un resumen). 
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Totales */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
          <div />
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#475569' }}>Subtotal</span>
              <strong>{fmtCurrency(h.subtotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#475569' }}>IVA</span>
              <strong>{fmtCurrency(h.iva)}</strong>
            </div>
            <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>Total</span>
              <strong style={{ fontSize: 18 }}>{fmtCurrency(h.total)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}