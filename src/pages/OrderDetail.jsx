// src/pages/OrderDetail.jsx
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById } from '../services/orders.service';
import { fmtCurrency } from '../lib/format';

function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(+d)) return '-';
  return d.toLocaleDateString('es-AR');
}

export default function OrderDetail() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order.detail', id],
    queryFn: () => fetchOrderById(id),
    staleTime: 0,
  });

  // Normalización suave según lo que devuelva el backend
  const header = data || {};
  const oid     = header.id ?? id;
  const fecha   = header.fecha ?? header.date ?? null;
  const cliente = header.client ?? header.cliente ?? header.clientName ?? '';
  const pm      = header.pm ?? header.medioPago ?? null;
  const estado  = header.estado ?? header.status ?? null;
  const afip    = header.afip ?? null;

  const items = Array.isArray(header.items) ? header.items : [];

  // Total: usa el del header si está; si no, calcula
  const totalCalc = items.reduce((acc, it) => {
    const q = Number(it.qty ?? it.cantidad ?? 0) || 0;
    const p = Number(it.price ?? it.precio ?? 0) || 0;
    const lt = Number(it.lineTotal ?? it.importe ?? q * p) || 0;
    return acc + lt;
  }, 0);
  const total = Number(header.total ?? totalCalc) || 0;
  const subtotal = Number(header.subtotal ?? (items.length ? total : 0)) || 0;
  const iva = Number(header.iva ?? 0) || 0;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>
          Venta #{oid}
        </h1>
        <Link
          to="/sales"
          style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
        >
          ← Volver a ventas
        </Link>
      </div>

      {/* Estado de carga/errores */}
      {isError && (
        <div style={{ color: '#b91c1c', marginBottom: 10 }}>
          Error cargando la venta.
        </div>
      )}
      {isLoading && (
        <div style={{ color: '#475569', marginBottom: 10 }}>
          Cargando…
        </div>
      )}

      {!isLoading && (
        <>
          {/* Cabecera compacta */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Fecha</div>
              <div style={{ fontWeight: 600 }}>{fmtDate(fecha)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Cliente</div>
              <div style={{ fontWeight: 600 }}>{cliente || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Medio de pago</div>
              <div style={{ fontWeight: 600 }}>{pm || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Estado</div>
              <div style={{ fontWeight: 600 }}>{estado || '-'}</div>
            </div>
            {afip?.tipo && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>AFIP</div>
                <div style={{ fontWeight: 600 }}>
                  Tipo {afip.tipo}{' '}
                  {afip.cae ? `· CAE ${afip.cae}` : ''}{' '}
                  {afip.vtoCae ? `· Vto ${fmtDate(afip.vtoCae)}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Ítems */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
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
                {items.map((it, idx) => {
                  const prod = it.product ?? it.productName ?? `#${it.productId ?? ''}`;
                  const qty = Number(it.qty ?? it.cantidad ?? 0) || 0;
                  const price = Number(it.price ?? it.precio ?? 0) || 0;
                  const line = Number(it.lineTotal ?? it.importe ?? qty * price) || 0;
                  return (
                    <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 8px' }}>{prod}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{qty}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(price)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(line)}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 16, color: '#64748b' }}>
                      Sin ítems (el endpoint simple no los incluye).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
            <div />
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#475569' }}>Subtotal</span>
                <strong>{fmtCurrency(subtotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#475569' }}>IVA</span>
                <strong>{fmtCurrency(iva)}</strong>
              </div>
              <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Total</span>
                <strong style={{ fontSize: 18 }}>{fmtCurrency(total)}</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}